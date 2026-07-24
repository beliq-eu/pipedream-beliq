import os from "os";
import path from "path";
import fsp from "fs/promises";
import {
  describe, expect, it,
} from "vitest";
import { Beliq } from "@beliq/sdk";
import { runGenerate } from "../components/beliq/actions/generate-invoice/generate-invoice.mjs";
import { runValidate } from "../components/beliq/actions/validate-invoice/validate-invoice.mjs";
import { runParse } from "../components/beliq/actions/parse-invoice/parse-invoice.mjs";
import { runConvert } from "../components/beliq/actions/convert-invoice/convert-invoice.mjs";
import { runCheckAccount } from "../components/beliq/actions/check-account/check-account.mjs";
import {
  asJsonObject, createClient, mapError,
} from "../components/beliq/common/client.mjs";
import { resolveDocument } from "../components/beliq/common/io.mjs";
import {
  CONVERT_TARGET_OPTIONS,
  STANDARD_OPTIONS,
  VALIDATE_FORMAT_OPTIONS,
} from "../components/beliq/common/options.mjs";

// These tests drive a real SDK client whose only injected boundary is `fetch`
// (a recorder returning a canned Response). The binary writers hit the real
// /tmp dir. So prop -> SDK-call mapping, the wire request, response parsing, and
// output shaping are all asserted against real SDK code, not a re-implementation.

function clientReturning(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({
      url: String(url),
      method: init?.method,
      headers: new Headers(init?.headers),
      body: init?.body,
    });
    return responder();
  };
  return {
    client: new Beliq({
      apiKey: "test-key",
      fetch: fetchImpl,
    }),
    calls,
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify({
    success: status < 400,
    data,
  }), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function errorResponse(code, message, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    error: {
      code,
      message,
    },
  }), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function bodyText(body) {
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf8");
  }
  return String(body ?? "");
}

describe("runValidate", () => {
  it("sends pasted text as the raw body and returns the parsed verdict", async () => {
    const verdict = {
      valid: true,
      format: "cii",
      errors: [],
      warnings: [],
    };
    const {
      client, calls,
    } = clientReturning(() => jsonResponse(verdict));

    const result = await runValidate(client, {
      inputSource: "text",
      documentText: "<Invoice/>",
      contentType: "auto",
      format: "auto",
      franceCtc: false,
    });

    expect(result).toEqual(verdict);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toMatch(/^https:\/\/api\.beliq\.eu\/v1\/validate\?/);
    expect(calls[0].url).toContain("format=auto");
    // Auto content type sniffs XML from the leading bytes.
    expect(calls[0].headers.get("content-type")).toBe("application/xml");
    expect(bodyText(calls[0].body)).toBe("<Invoice/>");
  });

  it("honors an explicit PDF content type override", async () => {
    const {
      client, calls,
    } = clientReturning(() => jsonResponse({
      valid: true,
      format: "cii",
      errors: [],
    }));

    await runValidate(client, {
      inputSource: "text",
      documentText: "%PDF-1.7 ...",
      contentType: "application/pdf",
    });

    expect(calls[0].headers.get("content-type")).toBe("application/pdf");
  });

  it("maps a beliq error envelope to a flat readable error", async () => {
    const { client } = clientReturning(() => errorResponse("VALIDATION_ERROR", "bad document"));

    await expect(runValidate(client, {
      inputSource: "text",
      documentText: "<x/>",
      contentType: "auto",
    })).rejects.toThrow("bad document (VALIDATION_ERROR)");
  });
});

describe("runParse", () => {
  it("targets /v1/parse and returns the parsed invoice JSON", async () => {
    const parsed = {
      invoice: {
        number: "INV-1",
      },
    };
    const {
      client, calls,
    } = clientReturning(() => jsonResponse(parsed));

    const result = await runParse(client, {
      inputSource: "text",
      documentText: "<Invoice/>",
      contentType: "auto",
      format: "cii",
    });

    expect(result).toEqual(parsed);
    expect(calls[0].url).toContain("/v1/parse?");
    expect(calls[0].url).toContain("format=cii");
  });
});

describe("runGenerate", () => {
  it("posts the invoice JSON, writes the XML to /tmp, and returns metadata", async () => {
    const {
      client, calls,
    } = clientReturning(() => new Response("<Invoice>generated</Invoice>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
        "x-schematron-version": "1.2.3",
      },
    }));

    const result = await runGenerate(client, {
      standard: "xrechnung",
      output: "xml",
      invoice: {
        number: "INV-1",
      },
      verify: true,
      advanced: {},
    });

    const sentBody = JSON.parse(bodyText(calls[0].body));
    expect(calls[0].url).toBe("https://api.beliq.eu/v1/generate");
    expect(sentBody.standard).toBe("xrechnung");
    expect(sentBody.output).toBe("xml");
    expect(sentBody.invoice).toEqual({
      number: "INV-1",
    });
    // No Factur-X profile is sent for a non-hybrid standard.
    expect(sentBody.facturxProfile).toBeUndefined();

    expect(result.filename).toBe("invoice.xml");
    expect(result.path).toBe(`${process.env.STASH_DIR || "/tmp"}/invoice.xml`);
    expect(result.schematronVersion).toBe("1.2.3");
    expect(result.xml).toBe("<Invoice>generated</Invoice>");
    expect(result.sizeBytes).toBeGreaterThan(0);
    // The bytes really landed on disk.
    expect(await fsp.readFile(result.path, "utf8")).toBe("<Invoice>generated</Invoice>");
  });

  it("includes the Factur-X profile only for the hybrid family and writes a .pdf", async () => {
    const { client } = clientReturning(() => new Response("%PDF-1.7 hybrid", {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "x-pdf-kind": "facturx",
      },
    }));

    const result = await runGenerate(client, {
      standard: "zugferd",
      output: "pdf",
      facturxProfile: "extended",
      invoice: {
        number: "INV-2",
      },
      verify: false,
    });

    expect(result.filename).toBe("invoice.pdf");
    expect(result.pdfKind).toBe("facturx");
    expect(result.xml).toBeUndefined();
  });

  it("resolves the NLCIUS target to peppol-bis + the netherlands-nlcius profile", async () => {
    const {
      client, calls,
    } = clientReturning(() => new Response("<Invoice/>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
      },
    }));

    await runGenerate(client, {
      standard: "nlcius",
      output: "pdf",
      invoice: {
        number: "NL-1",
      },
      verify: false,
    });

    const sentBody = JSON.parse(bodyText(calls[0].body));
    expect(sentBody.standard).toBe("peppol-bis");
    expect(sentBody.profile).toBe("netherlands-nlcius");
    // NLCIUS is a UBL profile: the preset forces XML even though pdf was passed.
    expect(sentBody.output).toBe("xml");
  });
});

describe("runConvert", () => {
  it("passes the target format and writes the converted bytes to /tmp", async () => {
    const {
      client, calls,
    } = clientReturning(() => new Response("<ubl>converted</ubl>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
        "x-source-format": "cii",
        "x-target-format": "ubl",
      },
    }));

    const result = await runConvert(client, {
      inputSource: "text",
      documentText: "<cii/>",
      contentType: "auto",
      sourceFormat: "auto",
      targetFormat: "ubl",
      dropFranceCtcOverlay: false,
    });

    expect(calls[0].url).toContain("/v1/convert?");
    expect(calls[0].url).toContain("targetFormat=ubl");
    expect(result.filename).toBe("converted.xml");
    expect(result.targetFormat).toBe("ubl");
    expect(result.sourceFormat).toBe("cii");
  });
});

describe("runCheckAccount", () => {
  it("hits /v1/me and returns the account context", async () => {
    const account = {
      plan: "free",
      quota: {
        limit: 50,
      },
    };
    const {
      client, calls,
    } = clientReturning(() => jsonResponse(account));

    const result = await runCheckAccount(client);

    expect(calls[0].url).toBe("https://api.beliq.eu/v1/me");
    expect(result).toEqual({
      success: true,
      account,
    });
  });
});

describe("resolveDocument", () => {
  it("rejects empty pasted text", async () => {
    await expect(resolveDocument({
      inputSource: "text",
      documentText: "   ",
    })).rejects.toThrow(/Paste the invoice XML/);
  });

  it("rejects a file input with no path", async () => {
    await expect(resolveDocument({
      inputSource: "file",
    })).rejects.toThrow(/Provide a file path or URL/);
  });

  it("reads bytes from a real file path", async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "beliq-pd-"));
    const filePath = path.join(dir, "doc.xml");
    await fsp.writeFile(filePath, "<ubl/>");

    const {
      bytes, contentType,
    } = await resolveDocument({
      inputSource: "file",
      filePath,
      contentType: "auto",
    });

    expect(Buffer.from(bytes).toString("utf8")).toBe("<ubl/>");
    expect(contentType).toBeUndefined();
  });
});

describe("createClient", () => {
  it("builds a client that targets api.beliq.eu with the connected key", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({
        url: String(url),
        headers: new Headers(init?.headers),
      });
      return jsonResponse({
        plan: "free",
      });
    };
    const client = createClient({
      api_key: "abc",
    }, fetchImpl);

    await client.me();

    expect(calls[0].url).toBe("https://api.beliq.eu/v1/me");
    expect(calls[0].headers.get("x-api-key")).toBe("abc");
  });
});

describe("option lists", () => {
  it("sources values straight from the SDK LIVE_* lists", () => {
    expect(STANDARD_OPTIONS.map((o) => o.value)).toEqual([
      "xrechnung",
      "zugferd",
      "facturx",
      "peppol-bis",
      "nlcius",
    ]);
    expect(VALIDATE_FORMAT_OPTIONS.map((o) => o.value)).toContain("auto");
    // A convert target can never be auto-detected.
    expect(CONVERT_TARGET_OPTIONS.map((o) => o.value)).not.toContain("auto");
  });
});

describe("asJsonObject / mapError", () => {
  it("parses a JSON string and drops empty objects", () => {
    expect(asJsonObject("{\"a\":1}")).toEqual({
      a: 1,
    });
    expect(asJsonObject("{}")).toBeUndefined();
    expect(asJsonObject("")).toBeUndefined();
    expect(asJsonObject("not json")).toBeUndefined();
  });

  it("passes a plain Error through unchanged", () => {
    const e = new Error("boom");
    expect(mapError(e)).toBe(e);
  });
});
