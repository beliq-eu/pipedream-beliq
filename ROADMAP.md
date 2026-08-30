# pipedream-beliq roadmap

beliq connector for Pipedream (portfolio item D6.2 in
`~/Projects/beliq/beliq-hq/CONNECTORS-ROADMAP.md`). The component lives under
`components/beliq/`, laid out copy-paste-ready into the `PipedreamHQ/pipedream`
registry. It is a thin adapter over the published `@beliq/sdk`, mirroring the
`activepieces-beliq` connector.

## Done

Initial build pass complete and verified locally: the `beliq` app, the five
actions, the SDK client + options + IO helpers, examples, and the test + lint
gates are all in place and green.

- [x] Scaffold repo, root tooling, `.gitignore`, `.eslintrc.cjs`, `vitest.config.mjs`, `renovate.json`.
- [x] `components/beliq/package.json` (`@pipedream/beliq`, dep `@beliq/sdk`).
- [x] `beliq.app.mjs` (shared propDefinitions + `client()` method building the SDK client).
- [x] `common/client.mjs` (createClient, mapError, asJsonObject), `common/options.mjs`
  (LIVE_* -> dropdowns), `common/io.mjs` (text/file input, /tmp output).
- [x] Five actions: generate-invoice, validate-invoice, parse-invoice, convert-invoice,
  check-account (zero quota).
- [x] Unit tests (`test/connector.test.mjs`) + live smoke (`test/integration.test.mjs`).
- [x] Per-action examples + README + this roadmap.

## Verified

- `npm test`: 15 offline unit tests pass. They drive a real `@beliq/sdk` `Beliq`
  client over an injected recording `fetch` and write binary output to the real
  `/tmp`; only the network boundary is doubled. Asserts prop -> SDK-call mapping,
  the wire request (URL, method, content type, body), response parsing, output
  shaping, error mapping, and that the option lists come from the SDK LIVE_* lists.
- `npm run lint`: 0 errors, 5 advisory `default-value` warnings (genuinely
  optional props with no sensible default).
- `npm run scrub:check`: no em-dash.

## Distribution

- [x] Source repo LIVE: **https://github.com/beliq-eu/pipedream-beliq** (public,
  default branch `main`, committed as `beliq <hello@beliq.eu>`, pushed 2026-07-01
  with a pinned `beliq-eu` token; active gh account stayed `tobias-dev`).
- [ ] Open the registry PR to `PipedreamHQ/pipedream` (add the `beliq` app +
  the five actions under `components/beliq/`). The monorepo is large; add files
  via the Git Data API rather than a full clone, as done for polydoc.
- [ ] Pipedream must provision the `beliq` app auth (an `api_key` secret field
  and the connect-time test request) before the components are testable end to
  end and the PR can merge. Flag it in the PR body.
- [ ] Wire `BELIQ_API_KEY` and run `npm run test:integration` against the live API.
- [ ] Install in a real Pipedream workflow, connect an account, run the five
  actions, and capture screenshots.

## Notes / known unknowns

- Pipedream distributes components via the monorepo PR, not an npm publish we
  control, so the npm Trusted Publishing recipe used by the other connectors does
  not apply here.
- The SDK uses `globalThis.fetch`. Pipedream's runtime (Node 20+) provides it, so
  the connector does not depend on `@pipedream/platform`. Confirm in the live smoke.
- File input accepts a `/tmp` path or a URL; a URL is fetched with `globalThis.fetch`.
  Binary output is written to the synced `/tmp` dir (the `syncDir` prop), since
  Pipedream steps return JSON.
