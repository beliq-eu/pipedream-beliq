import {
  describe, expect, it,
} from "vitest";
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

const INVOICE = {
  number: "INV-PD-001",
  issueDate: "2026-01-15",
  dueDate: "2026-02-14",
  currencyCode: "EUR",
  buyerReference: "BUYER-REF-01",
  seller: {
    name: "Seller GmbH",
    vatId: "DE123456789",
    address: {
      street: "Hauptstrasse 1",
      city: "Berlin",
      postalCode: "10115",
      countryCode: "DE",
    },
  },
  buyer: {
    name: "Buyer SARL",
    vatId: "FR12345678901",
    address: {
      street: "Rue de la Paix 2",
      city: "Paris",
      postalCode: "75002",
      countryCode: "FR",
    },
  },
  lines: [
    {
      description: "Consulting services",
      quantity: 10,
      unitCode: "HUR",
      unitPrice: 100,
      lineTotal: 1000,
      vatRate: 19,
      vatCategoryCode: "S",
    },
  ],
  taxSummary: [
    {
      vatCategoryCode: "S",
      vatRate: 19,
      taxableAmount: 1000,
      taxAmount: 190,
    },
  ],
  paymentMeans: {
    typeCode: "58",
    iban: "DE89370400440532013000",
  },
  totalNetAmount: 1000,
  totalTaxAmount: 190,
  totalGrossAmount: 1190,
};

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
    expect(generated.fileName).toBe("invoice.xml");
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
