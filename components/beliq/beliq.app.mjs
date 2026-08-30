import { createClient } from "./common/client.mjs";
import {
  CONTENT_TYPE_OPTIONS,
  CONVERT_SOURCE_OPTIONS,
  CONVERT_TARGET_OPTIONS,
  INPUT_SOURCE_OPTIONS,
  OUTPUT_OPTIONS,
  PARSE_FORMAT_OPTIONS,
  PROFILE_OPTIONS,
  STANDARD_OPTIONS,
  VALIDATE_FORMAT_OPTIONS,
} from "./common/options.mjs";

// A self-contained EN 16931 invoice used as the Generate action's default, so
// the action runs out of the box and documents the expected shape.
// The prefilled example, and the shape a first run actually succeeds with. The
// request schema was already satisfied; XRechnung's own rules were not, since
// BR-DE-2 wants a seller contact and PEPPOL-EN16931-R010/R020 want an
// electronic address on both parties. Verified against POST /v1/generate.
const SAMPLE_INVOICE = {
  number: "INV-2026-001",
  issueDate: "2026-01-15",
  dueDate: "2026-02-14",
  currencyCode: "EUR",
  buyerReference: "991-12345-67",
  seller: {
    name: "Seller GmbH",
    vatId: "DE123456789",
    contactName: "A Person",
    email: "billing@seller.example",
    phone: "+49 30 123456",
    address: {
      street: "Hauptstrasse 1",
      city: "Berlin",
      postalCode: "10115",
      countryCode: "DE",
    },
    peppol: {
      schemeId: "0088",
      id: "4030000000001",
    },
  },
  buyer: {
    name: "Buyer SARL",
    vatId: "FR12345678901",
    email: "ap@buyer.example",
    address: {
      street: "Rue de la Paix 2",
      city: "Paris",
      postalCode: "75002",
      countryCode: "FR",
    },
    peppol: {
      schemeId: "0088",
      id: "4030000000002",
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

export default {
  type: "app",
  app: "beliq",
  propDefinitions: {
    standard: {
      type: "string",
      label: "Standard",
      description: "The e-invoice standard to generate.",
      options: STANDARD_OPTIONS,
      default: "xrechnung",
    },
    output: {
      type: "string",
      label: "Output",
      description: "`xml` for a pure e-invoice, or `pdf` for a hybrid PDF/A-3 with the XML embedded.",
      options: OUTPUT_OPTIONS,
      default: "xml",
    },
    facturxProfile: {
      type: "string",
      label: "Factur-X / ZUGFeRD Profile",
      description: "Applied only when Standard (or Target Format) is Factur-X or ZUGFeRD. EXTENDED CTC FR is a Factur-X profile; ZUGFeRD ignores it.",
      options: PROFILE_OPTIONS,
      optional: true,
      default: "en16931",
    },
    invoice: {
      type: "object",
      label: "Invoice",
      description: "The invoice object in beliq EN 16931 shape. At minimum: `number`, `issueDate`, `currencyCode`, `seller`, `buyer`, `lines`, and the `totalNetAmount` / `totalTaxAmount` / `totalGrossAmount` totals. See [the docs](https://docs.beliq.eu).",
      default: SAMPLE_INVOICE,
    },
    verify: {
      type: "boolean",
      label: "Validate Result",
      description: "Validate the generated document before returning (fails closed on a bad result).",
      optional: true,
      default: true,
    },
    pdfTemplateId: {
      type: "string",
      label: "PDF Template ID",
      description: "Render the hybrid PDF from a saved dashboard template (PDF output only).",
      optional: true,
    },
    inputSource: {
      type: "string",
      label: "Input",
      description: "Where to read the document from: pasted text, or a file referenced by a `/tmp` path or a URL.",
      options: INPUT_SOURCE_OPTIONS,
      default: "text",
    },
    documentText: {
      type: "string",
      label: "Document Text",
      description: "The invoice XML as text. Used when Input is Text.",
      optional: true,
    },
    filePath: {
      type: "string",
      label: "File Path or URL",
      description: "A path to a file in `/tmp` (for example from a previous step) or a public URL. Used when Input is File.",
      optional: true,
    },
    contentType: {
      type: "string",
      label: "Content Type",
      description: "Content type of the input document, or auto-detect from its bytes.",
      options: CONTENT_TYPE_OPTIONS,
      optional: true,
      default: "auto",
    },
    validateFormat: {
      type: "string",
      label: "Format",
      description: "Hint the expected syntax, or auto-detect from the document.",
      options: VALIDATE_FORMAT_OPTIONS,
      optional: true,
      default: "auto",
    },
    parseFormat: {
      type: "string",
      label: "Format",
      description: "Hint the expected syntax, or auto-detect from the document.",
      options: PARSE_FORMAT_OPTIONS,
      optional: true,
      default: "auto",
    },
    franceCtc: {
      type: "boolean",
      label: "Apply France CTC Overlay",
      description: "Also apply the French CTC (Flux 2) Schematron overlay.",
      optional: true,
      default: false,
    },
    sourceFormat: {
      type: "string",
      label: "Source Format",
      description: "The source format, or auto-detect from the document.",
      options: CONVERT_SOURCE_OPTIONS,
      optional: true,
      default: "auto",
    },
    targetFormat: {
      type: "string",
      label: "Target Format",
      description: "The format to convert the document to.",
      options: CONVERT_TARGET_OPTIONS,
      default: "ubl",
    },
    targetProfile: {
      type: "string",
      label: "Target Profile",
      description: "Applied only when Target Format is Factur-X or ZUGFeRD.",
      options: PROFILE_OPTIONS,
      optional: true,
      default: "en16931",
    },
    dropFranceCtcOverlay: {
      type: "boolean",
      label: "Drop France CTC Overlay",
      description: "Drop the French CTC overlay when the target cannot carry it (lossy).",
      optional: true,
      default: false,
    },
    filename: {
      type: "string",
      label: "Filename",
      description: "Output filename for the written document. Defaults to `invoice` / `converted` plus the right extension.",
      optional: true,
    },
    advanced: {
      type: "object",
      label: "Advanced (JSON)",
      description: "Raw fields deep-merged into the request for any option not exposed above. Example: `{ \"someField\": \"value\" }`.",
      optional: true,
    },
  },
  methods: {
    /** Build a configured beliq SDK client from the connected account. */
    client() {
      return createClient(this.$auth);
    },
  },
};
