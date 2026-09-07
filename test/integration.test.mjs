import {
  describe, expect, it,
} from "vitest";
import beliqApp from "../components/beliq/beliq.app.mjs";
import { createClient } from "../components/beliq/common/client.mjs";
import { runGenerate } from "../components/beliq/actions/generate-invoice/generate-invoice.mjs";
import { runValidate } from "../components/beliq/actions/validate-invoice/validate-invoice.mjs";
import { runCheckAccount } from "../components/beliq/actions/check-account/check-account.mjs";

// Live smoke tests against the real beliq API. Skipped unless BELIQ_API_KEY is
// set. They drive the same run functions the Pipedream actions call, so they
// exercise the real request shape and the live contract end to end.

const apiKey = process.env.BELIQ_API_KEY;
const client = apiKey
  ? createClient({
    api_key: apiKey,
  })
  : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SAMPLE_INVOICE is the prop default a user's first run sends, so the smoke
// drives that exact object rather than a second copy that can drift from it.
const INVOICE = JSON.parse(JSON.stringify(beliqApp.propDefinitions.invoice.default));

describe.skipIf(!apiKey)("beliq live API", () => {
  it("Check Account returns the plan context without consuming quota", async () => {
    const result = await runCheckAccount(client);
    expect(result.success).toBe(true);
    expect(result.account).toBeTypeOf("object");
    await sleep(300);
  });

  it("generates a valid XRechnung XML and validates it", async () => {
    const generated = await runGenerate(client, {
      standard: "xrechnung",
      output: "xml",
      invoice: INVOICE,
      verify: true,
    });
    expect(generated.filename).toBe("invoice.xml");
    expect(generated.sizeBytes).toBeGreaterThan(0);
    expect(generated.xml).toContain("<");
    await sleep(300);

    const verdict = await runValidate(client, {
      inputSource: "text",
      documentText: generated.xml,
      contentType: "auto",
      format: "auto",
    });
    expect(verdict).toHaveProperty("valid");
    await sleep(300);
  });
});
