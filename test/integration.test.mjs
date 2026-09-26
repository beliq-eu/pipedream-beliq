import {
  describe, expect, it,
} from "vitest";
import { SAMPLE_INVOICE } from "../components/beliq/common/constants.mjs";
import generateInvoice from "../components/beliq/actions/generate-invoice/generate-invoice.mjs";
import validateInvoice from "../components/beliq/actions/validate-invoice/validate-invoice.mjs";
import checkAccount from "../components/beliq/actions/check-account/check-account.mjs";
import { runAction } from "./harness.mjs";

// Live smoke tests against the real beliq API. Skipped unless BELIQ_API_KEY is
// set. They run the shipped actions through the app methods, the way a
// Pipedream step does, so they exercise the real request shape and the live
// contract end to end.

const apiKey = process.env.BELIQ_API_KEY;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SAMPLE_INVOICE is the example the Invoice description shows, so the smoke
// drives that exact object rather than a second copy that can drift from it.
const INVOICE = JSON.parse(JSON.stringify(SAMPLE_INVOICE));

// Runs with or without a key. Vitest turns an import of a missing named export
// into undefined rather than an error, and without a key the live suite below
// never calls what it imports, so a renamed export would pass every PR check
// and only fail on main. This is what lets the keyless CI run catch that.
describe("live smoke wiring", () => {
  it("loads every action and helper the live suite drives", () => {
    for (const action of [
      generateInvoice,
      validateInvoice,
      checkAccount,
    ]) {
      expect(typeof action?.run).toBe("function");
    }
    expect(typeof runAction).toBe("function");
    expect(INVOICE).toHaveProperty("number");
  });
});

describe.skipIf(!apiKey)("beliq live API", () => {
  it("Check Account returns the plan context without consuming quota", async () => {
    const { result } = await runAction(checkAccount, {}, apiKey);
    expect(result.success).toBe(true);
    expect(result.account).toBeTypeOf("object");
    await sleep(300);
  });

  it("generates a valid XRechnung XML and validates the written file", async () => {
    const { result: generated } = await runAction(generateInvoice, {
      standard: "xrechnung",
      output: "xml",
      invoice: INVOICE,
      verify: true,
    }, apiKey);
    expect(generated.filename).toBe("invoice.xml");
    expect(generated.sizeBytes).toBeGreaterThan(0);
    expect(generated.xml).toContain("<");
    await sleep(300);

    // Chained the way a workflow chains them: Generate's written file is
    // Validate's file input, read back through the platform's getFileStream.
    const { result: verdict } = await runAction(validateInvoice, {
      inputSource: "file",
      filePath: generated.path,
      contentType: "auto",
      format: "auto",
    }, apiKey);
    expect(verdict).toHaveProperty("valid");
    await sleep(300);
  });
});
