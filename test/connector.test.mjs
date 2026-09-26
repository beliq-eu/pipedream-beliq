import os from "os";
import path from "path";
import http from "http";
import fsp from "fs/promises";
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { ConfigurationError } from "@pipedream/platform";
import generateInvoice from "../components/beliq/actions/generate-invoice/generate-invoice.mjs";
import validateInvoice from "../components/beliq/actions/validate-invoice/validate-invoice.mjs";
import parseInvoice from "../components/beliq/actions/parse-invoice/parse-invoice.mjs";
import convertInvoice from "../components/beliq/actions/convert-invoice/convert-invoice.mjs";
import checkAccount from "../components/beliq/actions/check-account/check-account.mjs";
import { mapError } from "../components/beliq/common/errors.mjs";
import { resolveDocument } from "../components/beliq/common/io.mjs";
import { parseObject } from "../components/beliq/common/utils.mjs";
import {
  CONVERT_TARGET_OPTIONS,
  STANDARD_OPTIONS,
  VALIDATE_FORMAT_OPTIONS,
} from "../components/beliq/common/constants.mjs";
import { runAction } from "./harness.mjs";

// These tests run the real actions against the real app methods and a real SDK
// client. The only doubled boundary is the network: global fetch is replaced by
// a recorder that answers api.beliq.eu with a canned Response and passes every
// other URL to the real fetch. The binary writers hit the real /tmp dir. So
// prop -> SDK-call mapping, the wire request, response parsing, error mapping
// and output shaping are all asserted against shipped code.

const API_ORIGIN = "https://api.beliq.eu/";
const realFetch = globalThis.fetch;
let calls;
let responder;

function respondWith(fn) {
  responder = fn;
}

beforeEach(() => {
  calls = [];
  responder = () => {
    throw new Error("the test did not set a response");
  };
  vi.stubGlobal("fetch", async (url, init) => {
    if (!String(url).startsWith(API_ORIGIN)) {
      return realFetch(url, init);
    }
    calls.push({
      url: String(url),
      method: init?.method,
      headers: new Headers(init?.headers),
      body: init?.body,
    });
    return responder();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

function errorResponse(code, message, status = 400, details) {
  return new Response(JSON.stringify({
    success: false,
    error: {
      code,
      message,
      ...(details
        ? {
          details,
        }
        : {}),
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

describe("Validate Invoice", () => {
  it("sends pasted text as the raw body and returns the parsed verdict", async () => {
    const verdict = {
      valid: true,
      format: "cii",
      errors: [],
      warnings: [],
    };
    respondWith(() => jsonResponse(verdict));

    const {
      result, summary,
    } = await runAction(validateInvoice, {
      inputSource: "text",
      documentText: "<Invoice/>",
      contentType: "auto",
      format: "auto",
      franceCtc: false,
    });

    expect(result).toEqual(verdict);
    expect(summary).toBe("Document is valid");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toMatch(/^https:\/\/api\.beliq\.eu\/v1\/validate\?/);
    expect(calls[0].url).toContain("format=auto");
    // Auto content type sniffs XML from the leading bytes.
    expect(calls[0].headers.get("content-type")).toBe("application/xml");
    // The connected account's key, not a key of the test's own.
    expect(calls[0].headers.get("x-api-key")).toBe("test-key");
    expect(bodyText(calls[0].body)).toBe("<Invoice/>");
  });

  it("returns an invalid verdict as a result and counts its errors in the summary", async () => {
    respondWith(() => jsonResponse({
      valid: false,
      format: "cii",
      errors: [
        {
          ruleId: "BR-DE-2",
        },
        {
          ruleId: "BR-DE-15",
        },
      ],
    }));

    const {
      result, summary,
    } = await runAction(validateInvoice, {
      inputSource: "text",
      documentText: "<Invoice/>",
    });

    expect(result.valid).toBe(false);
    expect(summary).toBe("Document is invalid (2 errors)");
  });

  it("honors an explicit PDF content type override", async () => {
    respondWith(() => jsonResponse({
      valid: true,
      format: "cii",
      errors: [],
    }));

    await runAction(validateInvoice, {
      inputSource: "text",
      documentText: "%PDF-1.7 ...",
      contentType: "application/pdf",
    });

    expect(calls[0].headers.get("content-type")).toBe("application/pdf");
  });

  it("maps a beliq error envelope to a flat readable error", async () => {
    respondWith(() => errorResponse("VALIDATION_ERROR", "bad document"));

    await expect(runAction(validateInvoice, {
      inputSource: "text",
      documentText: "<x/>",
      contentType: "auto",
    })).rejects.toThrow("bad document (VALIDATION_ERROR)");
  });
});

describe("Parse Invoice", () => {
  it("targets /v1/parse and returns the parsed invoice JSON", async () => {
    const parsed = {
      format: "cii",
      invoice: {
        number: "INV-1",
      },
    };
    respondWith(() => jsonResponse(parsed));

    const {
      result, summary,
    } = await runAction(parseInvoice, {
      inputSource: "text",
      documentText: "<Invoice/>",
      contentType: "auto",
      format: "cii",
    });

    expect(result).toEqual(parsed);
    expect(summary).toBe("Parsed CII invoice INV-1");
    expect(calls[0].url).toContain("/v1/parse?");
    expect(calls[0].url).toContain("format=cii");
  });
});

describe("Generate Invoice", () => {
  it("posts the invoice JSON, writes the XML to /tmp, and returns metadata", async () => {
    respondWith(() => new Response("<Invoice>generated</Invoice>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
        "x-schematron-version": "1.2.3",
      },
    }));

    const { result } = await runAction(generateInvoice, {
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
    respondWith(() => new Response("%PDF-1.7 hybrid", {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "x-pdf-kind": "facturx",
      },
    }));

    const { result } = await runAction(generateInvoice, {
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
    respondWith(() => new Response("<Invoice/>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
      },
    }));

    await runAction(generateInvoice, {
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
    // ... and with XML output there is nothing to render.
    expect(sentBody.template).toBeUndefined();
  });

  // XRechnung and Peppol BIS have no hybrid PDF. The API refuses PDF output for
  // them unless the request names a visual to render, so without `template` the
  // PDF choice is a 400 no prop value avoids.
  it("asks for the built-in visual when PDF is chosen and no stored template is given", async () => {
    respondWith(() => new Response("%PDF-1.7 visual", {
      status: 200,
      headers: {
        "content-type": "application/pdf",
      },
    }));

    await runAction(generateInvoice, {
      standard: "xrechnung",
      output: "pdf",
      invoice: {
        number: "INV-3",
      },
      verify: false,
    });

    const sentBody = JSON.parse(bodyText(calls[0].body));
    expect(sentBody.output).toBe("pdf");
    expect(sentBody.template).toBe("standard");
  });

  // Factur-X and ZUGFeRD render their page either way, so the same field goes
  // out for them too rather than being gated on a standard list the connector
  // would then have to keep in step with the API.
  it("asks for the built-in visual on the hybrid standards as well", async () => {
    respondWith(() => new Response("%PDF-1.7 hybrid", {
      status: 200,
      headers: {
        "content-type": "application/pdf",
      },
    }));

    await runAction(generateInvoice, {
      standard: "zugferd",
      output: "pdf",
      invoice: {
        number: "INV-4",
      },
      verify: false,
    });

    expect(JSON.parse(bodyText(calls[0].body)).template).toBe("standard");
  });

  it("prefers a stored template over the built-in visual", async () => {
    respondWith(() => new Response("%PDF-1.7 visual", {
      status: 200,
      headers: {
        "content-type": "application/pdf",
      },
    }));

    await runAction(generateInvoice, {
      standard: "xrechnung",
      output: "pdf",
      pdfTemplateId: "k3d-9mp",
      invoice: {
        number: "INV-5",
      },
      verify: false,
    });

    const sentBody = JSON.parse(bodyText(calls[0].body));
    expect(sentBody.pdfTemplateId).toBe("k3d-9mp");
    expect(sentBody.template).toBeUndefined();
  });
});

describe("Generate Invoice profile and verify gating", () => {
  async function generate(props) {
    respondWith(() => new Response("<Invoice/>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
      },
    }));
    await runAction(generateInvoice, {
      output: "xml",
      invoice: {
        number: "INV-1",
      },
      advanced: {},
      ...props,
    });
    return JSON.parse(bodyText(calls[0].body));
  }

  it("drops the France CTC overlay profile on ZUGFeRD", async () => {
    // One dropdown covers both hybrid standards, but ZUGFeRD has no counterpart
    // for extended-ctc-fr, so the pair is a 422 PROFILE_STANDARD_MISMATCH.
    const body = await generate({
      standard: "zugferd",
      facturxProfile: "extended-ctc-fr",
    });
    expect(body.facturxProfile).toBeUndefined();
  });

  it("keeps a profile the standard does accept", async () => {
    const body = await generate({
      standard: "facturx",
      facturxProfile: "extended-ctc-fr",
    });
    expect(body.facturxProfile).toBe("extended-ctc-fr");
  });

  it("keeps a profile ZUGFeRD shares with Factur-X", async () => {
    const body = await generate({
      standard: "zugferd",
      facturxProfile: "extended",
    });
    expect(body.facturxProfile).toBe("extended");
  });

  it("verifies when the prop is absent, matching its declared default", async () => {
    // An absent prop is the default, not an opt-out: a workflow saved before the
    // prop existed must not silently skip validation.
    const body = await generate({
      standard: "xrechnung",
    });
    expect(body.verify).toBe(true);
  });

  it("skips verification only on an explicit false", async () => {
    const body = await generate({
      standard: "xrechnung",
      verify: false,
    });
    expect(body.verify).toBe(false);
  });
});

describe("Convert Invoice", () => {
  it("passes the target format and writes the converted bytes to /tmp", async () => {
    respondWith(() => new Response("<ubl>converted</ubl>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
        "x-source-format": "cii",
        "x-target-format": "ubl",
      },
    }));

    const { result } = await runAction(convertInvoice, {
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

describe("Convert Invoice targets", () => {
  function convertResponse() {
    return new Response("<converted/>", {
      status: 200,
      headers: {
        "content-type": "application/xml",
      },
    });
  }

  // The SDK does the gating; this pins what reaches the wire either way.
  it("sends a target profile only to the Factur-X / ZUGFeRD family", async () => {
    respondWith(convertResponse);
    await runAction(convertInvoice, {
      inputSource: "text",
      documentText: "<cii/>",
      targetFormat: "ubl",
      targetProfile: "extended",
    });
    respondWith(convertResponse);
    await runAction(convertInvoice, {
      inputSource: "text",
      documentText: "<ubl/>",
      targetFormat: "facturx",
      targetProfile: "extended",
    });

    expect(calls[0].url).not.toContain("extended");
    expect(calls[1].url).toContain("extended");
  });

  it("writes the converted document under the Filename given", async () => {
    respondWith(convertResponse);

    const { result } = await runAction(convertInvoice, {
      inputSource: "text",
      documentText: "<cii/>",
      targetFormat: "ubl",
      filename: "INV-7-ubl.xml",
    });

    expect(result.filename).toBe("INV-7-ubl.xml");
    expect(await fsp.readFile(result.path, "utf8")).toBe("<converted/>");
  });
});

describe("Check Account", () => {
  it("hits /v1/me with the connected key and returns the account context", async () => {
    const account = {
      plan: "free",
      quota: {
        limit: 50,
      },
    };
    respondWith(() => jsonResponse(account));

    const {
      result, summary,
    } = await runAction(checkAccount, {}, "abc");

    expect(calls[0].url).toBe("https://api.beliq.eu/v1/me");
    expect(calls[0].headers.get("x-api-key")).toBe("abc");
    expect(result).toEqual({
      success: true,
      account,
    });
    expect(summary).toBe("beliq API key is valid");
  });
});

describe("error details", () => {
  it("names the failing rules of a 422 INVALID_INVOICE, five at most", async () => {
    const errors = [
      "BR-DE-1",
      "BR-DE-2",
      "BR-DE-15",
      "BR-CO-13",
      "BR-CO-15",
      "BR-S-01",
      "BR-S-08",
    ].map((ruleId) => ({
      ruleId,
      message: `${ruleId} failed`,
      location: "/Invoice",
    }));
    respondWith(() => errorResponse("INVALID_INVOICE", "Generated invoice failed validation", 422, {
      validationResult: {
        valid: false,
        errors,
      },
    }));

    const failure = runAction(generateInvoice, {
      standard: "xrechnung",
      output: "xml",
      invoice: {
        number: "INV-1",
      },
    });

    await expect(failure).rejects.toThrow("Generated invoice failed validation: BR-DE-1 BR-DE-1 failed at /Invoice; ");
    await expect(failure).rejects.toThrow("BR-CO-15 BR-CO-15 failed at /Invoice (+2 more) (INVALID_INVOICE)");
  });

  it("names the fields of a 400 VALIDATION_ERROR", async () => {
    respondWith(() => errorResponse("VALIDATION_ERROR", "body/invoice must have required property 'number'", 400, {
      fields: [
        {
          path: "/invoice",
          message: "must have required property 'number'",
          keyword: "required",
        },
      ],
    }));

    await expect(runAction(generateInvoice, {
      standard: "xrechnung",
      output: "xml",
      invoice: {
        issueDate: "2026-01-15",
      },
    })).rejects.toThrow(": /invoice must have required property 'number' (VALIDATION_ERROR)");
  });

  it("names the paths a fail-closed conversion could not carry", async () => {
    respondWith(() => errorResponse("CONVERSION_LOSSY_FAILCLOSED", "UBL has no equivalent extension", 422, {
      unmappablePaths: [
        "/rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:BusinessProcessSpecifiedDocumentContextParameter",
      ],
    }));

    await expect(runAction(convertInvoice, {
      inputSource: "text",
      documentText: "<cii/>",
      targetFormat: "ubl",
    })).rejects.toThrow("extension: /rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:BusinessProcessSpecifiedDocumentContextParameter (CONVERSION_LOSSY_FAILCLOSED)");
  });

  it("passes a plain Error through unchanged", () => {
    const e = new Error("boom");
    expect(mapError(e)).toBe(e);
  });
});

describe("resolveDocument", () => {
  it("rejects empty pasted text as a configuration error", async () => {
    const failure = resolveDocument({
      inputSource: "text",
      documentText: "   ",
    });
    await expect(failure).rejects.toThrow(ConfigurationError);
    await expect(failure).rejects.toThrow(/Paste the invoice XML/);
  });

  it("rejects a file input with no path as a configuration error", async () => {
    const failure = resolveDocument({
      inputSource: "file",
    });
    await expect(failure).rejects.toThrow(ConfigurationError);
    await expect(failure).rejects.toThrow(/Provide a file path or URL/);
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

  it("names a file path that does not exist", async () => {
    await expect(resolveDocument({
      inputSource: "file",
      filePath: "/tmp/beliq-pd-no-such-file.xml",
    })).rejects.toThrow("File not found: /tmp/beliq-pd-no-such-file.xml");
  });

  it("downloads a document from a URL", async () => {
    const server = http.createServer((req, res) => {
      if (req.url === "/invoice.xml") {
        res.writeHead(200, {
          "content-type": "application/xml",
        });
        res.end("<Invoice>from a url</Invoice>");
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const { bytes } = await resolveDocument({
        inputSource: "file",
        filePath: `${base}/invoice.xml`,
      });
      expect(Buffer.from(bytes).toString("utf8")).toBe("<Invoice>from a url</Invoice>");

      await expect(resolveDocument({
        inputSource: "file",
        filePath: `${base}/missing.xml`,
      })).rejects.toThrow(/404/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
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

describe("parseObject", () => {
  it("parses a JSON string and drops empty objects", () => {
    expect(parseObject("{\"a\":1}", "Advanced (JSON)")).toEqual({
      a: 1,
    });
    expect(parseObject("{}", "Advanced (JSON)")).toBeUndefined();
    expect(parseObject("", "Advanced (JSON)")).toBeUndefined();
    expect(parseObject(undefined, "Advanced (JSON)")).toBeUndefined();
  });

  it("rejects text that is not a JSON object, naming the field", () => {
    expect(() => parseObject("not json", "Advanced (JSON)")).toThrow(ConfigurationError);
    expect(() => parseObject("not json", "Advanced (JSON)")).toThrow(/^Advanced \(JSON\) is not valid JSON/);
    expect(() => parseObject("[1, 2]", "Invoice")).toThrow("Invoice must be a JSON object, not an array.");
  });

  it("stops Generate before any request when the invoice is malformed", async () => {
    // Before, a malformed string became `{}` and the API answered with a
    // schema error about fields the user had in fact typed.
    await expect(runAction(generateInvoice, {
      standard: "xrechnung",
      output: "xml",
      invoice: "{ \"number\": \"INV-1\", }",
    })).rejects.toThrow(/^Invoice is not valid JSON/);
    expect(calls).toHaveLength(0);
  });
});
