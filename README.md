# beliq connector for Pipedream

Generate, validate, parse, and convert EU-compliant e-invoices from a Pipedream
workflow. beliq checks documents against authority-pinned, nightly-drift-checked
rules (XRechnung, ZUGFeRD, Factur-X, Peppol BIS, EN 16931).

This repository is the source of truth for the `beliq` component in the
[Pipedream registry](https://github.com/PipedreamHQ/pipedream). It is not an npm
package; Pipedream distributes components from the registry monorepo.

## Actions

| Action | What it does |
| --- | --- |
| **Generate Invoice** | Build a compliant e-invoice (XML or hybrid PDF/A-3) from an EN 16931 invoice object. |
| **Validate Invoice** | Check an XML or PDF invoice against beliq's authority-pinned rules and return a structured verdict. |
| **Parse Invoice** | Extract a structured EN 16931 invoice object from an XML or PDF document. |
| **Convert Invoice** | Convert an invoice document from one EN 16931 format to another. |
| **Check Account** | Verify the connected API key and read its plan and quota. Does not consume quota. |

All five actions are thin adapters over the published [`@beliq/sdk`](https://www.npmjs.com/package/@beliq/sdk),
so the wire format (raw-body upload, content-type sniffing, the response
envelope, header metadata) lives in one tested place.

## Authentication

Connect a beliq account with an API key from the
[beliq dashboard](https://dashboard.beliq.eu) (API Keys). The component reads
`api_key` from the connected account and talks to `https://api.beliq.eu`.

## Documents in and out

- **Input** (Validate / Parse / Convert): paste the XML as text, or point the
  action at a file by a `/tmp` path (for example a file written by a previous
  step) or a public URL. Leave Content Type on Auto-detect to let beliq sniff
  XML vs PDF from the bytes.
- **Output** (Generate / Convert): the produced document is written to the
  step's synced `/tmp` directory and the action returns the file path plus
  metadata (content type, size, and the response headers such as the Schematron
  version or the source/target format). Downstream steps read the file by path.

## Format coverage

The format dropdowns list the formats beliq supports live today, sourced
directly from the SDK so they cannot drift from the public coverage. The connector
generates and validates a compliant document; transmission, filing, and reporting
stay with your access point.

## Development

```bash
npm install
npm test            # offline unit tests (real SDK client over an injected fetch)
npm run lint        # Pipedream component lint
npm run scrub:check # fail on a stray em-dash
```

Live smoke tests run against the real API and are skipped unless a key is set:

```bash
BELIQ_API_KEY=sk_... npm run test:integration
```

See [`examples/`](./examples) for per-action workflow sketches.
