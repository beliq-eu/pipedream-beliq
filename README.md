# beliq connector for Pipedream

Validate, generate, convert and parse EU e-invoices with the
[beliq](https://beliq.eu) API from a Pipedream workflow. Every verdict carries the
check depth the API states for it, or says that none was stated:
[How verification works](https://docs.beliq.eu/compliance/how-verification-works/)
explains each depth, and [Format coverage](#format-coverage) says where to read
each format's.

This repository is the source of truth for the `beliq` component in the
[Pipedream registry](https://github.com/PipedreamHQ/pipedream). It is not an npm
package; Pipedream distributes components from the registry monorepo.

## Actions

| Action | What it does |
| --- | --- |
| **Generate Invoice** | Build an e-invoice (XML or PDF) from an EN 16931 invoice object, with the API's verdict on it and the check depth the API states. |
| **Validate Invoice** | Check an XML or PDF invoice against the rule packs and schemas beliq lists for its format and return the API's verdict, with the check depth the API states. |
| **Parse Invoice** | Extract a structured EN 16931 invoice object from an XML or PDF document. |
| **Convert Invoice** | Convert an invoice document from one EN 16931 format to another. |
| **Check Account** | Verify the connected API key and read its plan and quota. Does not consume quota. |

All five actions call the API through methods on the `beliq` app
(`getAccount`, `generateInvoice`, `validateInvoice`, `parseInvoice`,
`convertInvoice`). Those methods are thin adapters over the published
[`@beliq/sdk`](https://www.npmjs.com/package/@beliq/sdk), so the wire format
(raw-body upload, content-type sniffing, the response envelope, header metadata)
lives in one tested place. A failed call raises an error that names the failing
rules, fields or unconvertible paths and ends in the stable `(CODE)`.

## Authentication

Connect a beliq account with an API key from the
[beliq dashboard](https://dashboard.beliq.eu) (API Keys). The component reads
`api_key` from the connected account and talks to `https://api.beliq.eu`.

## Documents in and out

- **Input** (Validate / Parse / Convert): paste the XML as text, or point the
  action at a file. File Path or URL is a `file-ref` prop read through
  `getFileStream` from `@pipedream/platform`, so it takes a `/tmp` path (for
  example the `path` a previous Generate or Convert step returned) or a URL, and
  those actions declare a synced `/tmp` directory with read access. Leave
  Content Type on Auto-detect to let beliq sniff XML vs PDF from the bytes.
- **Output** (Generate / Convert): the produced document is written to the
  step's synced `/tmp` directory and the action returns the file path plus
  metadata (content type, size, and the response headers such as the Schematron
  version or the source/target format). Downstream steps read the file by path.
  Generate also returns the document's `sha256` and the API's verdict in
  `validationResult`. An XML source converted to Factur-X or ZUGFeRD comes back
  as CII XML. A PDF comes back from Convert only when a hybrid PDF source is
  converted to one of them, and then `pdfNote` says which two things that PDF
  can be and what was checked on each
  ([detail](https://docs.beliq.eu/api-reference/convert/#a-pdf-sent-for-a-zugferd-or-factur-x-target)).

## Verdicts

Validate returns the API's result as it came. Read `valid` together with
`verificationBadgeLabel`, the check depth the API states for that result; a
result without it states none. `valid` means the document passed the rule packs
and schemas beliq lists for its format, in the stated versions. It does not mean
every recipient, validation tool or tax authority accepts it.

The step summary words the verdict as `VALID` or `INVALID` with the check depth
beside it, or `check depth not stated`. A France CTC block
(`franceCtcBlockingRuleIds`) ends a transmission even where `valid` is true, so
the summary names it first and counts the document as failed. Generate's
summary does the same for the verdict on the document it produced, and with
Validate Result off says the document was not validated.

## Format coverage

The format dropdowns come straight from the SDK's lists. The Standard dropdown
of **Generate Invoice** carries every standard `POST /v1/generate` accepts, plus
the NLCIUS profile of Peppol BIS. How deep beliq checks a format differs by
format. [`GET https://api.beliq.eu/v1/rulesets`](https://docs.beliq.eu/api-reference/rulesets/),
which needs no API key, publishes each format with its rule pack, the version in
force and its badge.

A national standard reads fields of its own from the invoice object. The
[generate reference](https://docs.beliq.eu/api-reference/generate/) lists them,
and the [format reference](https://docs.beliq.eu/format-reference/overview/) has a
page per country.

KSeF FA(3) generation covers ordinary VAT invoices in PLN between Polish parties,
at VAT rates 23, 22, 8, 7 and 5. The
[Poland KSeF FA(3) reference](https://docs.beliq.eu/format-reference/poland/)
states the full scope.

Only ZUGFeRD and Factur-X have a hybrid PDF, a PDF/A-3 with the XML embedded. For
the other standards, PDF output is a visualization with no XML inside it, and the
legal document is the XML. NLCIUS always returns XML.

The **Convert Invoice** dropdowns are shorter than the Generate one because the
API's own convert enums are: no national format is a conversion source or target.

The connector generates and validates the document. Transmission (Peppol, PA,
KSeF, SDI), filing and reporting stay with your access point: beliq does not
operate KSeF submission, and no action of this component sends or files an
invoice.

## Development

```bash
npm install
npm test            # offline tests: the real actions, app methods and SDK
                    # client, with only global fetch doubled; plus the
                    # registry review rules (test/registry-rules.test.mjs)
npm run lint        # Pipedream component lint, the registry's formatting
                    # rules and the size and complexity caps
npm run scrub:check # fail on a stray em-dash
```

Live smoke tests run against the real API and are skipped unless a key is set.
Without a key the file still runs one wiring test, which CI uses to catch a live
suite that imports something a change renamed:

```bash
BELIQ_API_KEY=blq_test_... npm run test:integration
```

See [`examples/`](./examples) for per-action workflow sketches.
