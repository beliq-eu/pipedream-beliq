import http from "http";
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import validateInvoice from "../components/beliq/actions/validate-invoice/validate-invoice.mjs";
import {
  ATTEMPT_TIMEOUT_MS, DEFAULT_RETRY_SECONDS, MAX_RETRY_SECONDS,
} from "../components/beliq/common/constants.mjs";
import { runAction } from "./harness.mjs";

// The real action, app methods and SDK client, with the fit they ship, against
// a real HTTP server on 127.0.0.1. Global fetch only rewrites the fixed
// https://api.beliq.eu origin to that server; the request itself goes out over
// the real fetch. Nothing is scaled: the server sends the real
// `Retry-After: 30`, and the host limit is a Pipedream workflow's default
// timeout for an HTTP trigger.
const HOST_LIMIT_MS = 30_000;
const PIPEDREAM_MAX_TIMEOUT_MS = 750_000;
const API_ORIGIN = "https://api.beliq.eu";
const realFetch = globalThis.fetch;

let origin;
let server;
let requests;
let handler;

function listen() {
  server = http.createServer((req, res) => {
    requests++;
    handler(req, res, requests);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    origin = `http://127.0.0.1:${server.address().port}`;
    resolve();
  }));
}

function close() {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}

beforeEach(async () => {
  requests = 0;
  await listen();
  vi.stubGlobal("fetch", (url, init) => realFetch(String(url).replace(API_ORIGIN, origin), init));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  if (server.listening) await close();
});

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function databaseUnavailable(res, retryAfter = 30) {
  json(res, 503, {
    success: false,
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: "database unavailable",
    },
  }, {
    "Retry-After": String(retryAfter),
  });
}

function valid(res) {
  json(res, 200, {
    success: true,
    data: {
      valid: true,
      errors: [],
      warnings: [],
    },
  });
}

/** The edge's answer with no beliq code and no `Retry-After`. */
function blip(res) {
  res.writeHead(503, {
    "Content-Type": "text/plain",
  });
  res.end("upstream unavailable");
}

async function validate(props = {}) {
  const started = performance.now();
  try {
    await runAction(validateInvoice, {
      inputSource: "text",
      documentText: "<Invoice/>",
      ...props,
    });
    return {
      ok: true,
      ms: performance.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      ms: performance.now() - started,
    };
  }
}

describe("a step during an outage ends inside the workflow's timeout", () => {
  it("the default fit leaves room for the last attempt, and the largest fits Pipedream's ceiling", () => {
    expect(DEFAULT_RETRY_SECONDS * 1000 + ATTEMPT_TIMEOUT_MS).toBeLessThan(HOST_LIMIT_MS);
    expect(MAX_RETRY_SECONDS * 1000 + ATTEMPT_TIMEOUT_MS).toBeLessThanOrEqual(PIPEDREAM_MAX_TIMEOUT_MS);
  });

  it("fails at once on a 503 DATABASE_UNAVAILABLE and names the server's wait", async () => {
    handler = (_req, res) => databaseUnavailable(res);
    const result = await validate();
    expect(result.ok).toBe(false);
    expect(result.message).toBe("beliq is unavailable for now: database unavailable. Try the step again in 30 seconds (DATABASE_UNAVAILABLE)");
    expect(requests).toBe(1);
    expect(result.ms).toBeLessThan(HOST_LIMIT_MS);
  });

  it("names the wait of a rate limit whose Retry-After passes the budget", async () => {
    handler = (_req, res) => json(res, 429, {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "rate limited",
      },
    }, {
      "Retry-After": "30",
    });
    const result = await validate();
    expect(result.message).toBe("rate limited. Try the step again in 30 seconds (RATE_LIMITED)");
    expect(requests).toBe(1);
  });

  it("rides a blip shorter than the default budget", async () => {
    handler = (_req, res, n) => (n === 1
      ? blip(res)
      : valid(res));
    const result = await validate();
    expect(result.ok).toBe(true);
    expect(requests).toBe(2);
  });

  it("rides an outage that a raised Retry for up to covers, and fails at once with 0", async () => {
    handler = (_req, res, n) => (n <= 2
      ? databaseUnavailable(res, 1)
      : valid(res));
    const raised = await validate({
      retryForSeconds: 3,
    });
    expect(raised.ok).toBe(true);
    expect(requests).toBe(3);

    requests = 0;
    const off = await validate({
      retryForSeconds: 0,
    });
    expect(off.ok).toBe(false);
    expect(off.message).toContain("Try the step again in 1 second (");
    expect(requests).toBe(1);
  });

  it("ends before the workflow's timeout when the retry after a blip hangs", async () => {
    handler = (_req, res, n) => {
      if (n === 1) blip(res);
    };
    const result = await validate();
    expect(result.ok).toBe(false);
    expect(requests).toBe(2);
    expect(result.ms).toBeGreaterThanOrEqual(ATTEMPT_TIMEOUT_MS);
    expect(result.ms).toBeLessThan(HOST_LIMIT_MS);
  }, HOST_LIMIT_MS + 10_000);

  it("says the API could not be reached, and that beliq did not say when, when nothing listens", async () => {
    await close();
    const result = await validate();
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/^beliq is unavailable for now: could not reach the beliq API \(.+\)\. beliq did not say when; try the step again later$/);
    expect(result.ms).toBeLessThan(HOST_LIMIT_MS);
  });
});
