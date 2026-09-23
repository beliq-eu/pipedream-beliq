# pipedream-beliq roadmap

`status: forward-gated: Pipedream provisioning the beliq app requested in https://github.com/PipedreamHQ/pipedream/issues/21996, which the registry PR waits for`

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
- [x] Unit tests (`test/connector.test.mjs`, `test/sample-invoice.test.mjs`) +
  live smoke (`test/integration.test.mjs`).
- [x] Per-action examples + README + this roadmap.

Landed on `main` after the initial build, oldest first, with related PRs on one
line (read from the merged PR list and `git log` on 2026-09-24, `main` at
`6a7d516`):

- [x] Document output field `fileName` renamed to `filename`, the convention the
  other connectors use. Pushed straight to `main` on 2026-07-01 without a PR:
  https://github.com/beliq-eu/pipedream-beliq/commit/440fdf4ce07bdf5828c1a199d36c1e0e0d5bd5a2
- [x] `renovate.json` extends the shared `beliq-eu/.github` preset:
  https://github.com/beliq-eu/pipedream-beliq/pull/1
- [x] NLCIUS generate target (`peppol-bis` + the `netherlands-nlcius` profile)
  and `@beliq/sdk` 0.2.0: https://github.com/beliq-eu/pipedream-beliq/pull/3
- [x] CI workflow `.github/workflows/ci.yml`: lint, unit tests and the em-dash
  scrub on every pull request and every push to `main`:
  https://github.com/beliq-eu/pipedream-beliq/pull/4
- [x] `extended-ctc-fr` dropped on ZUGFeRD (a 422 PROFILE_STANDARD_MISMATCH
  otherwise), `verify` on unless the prop is an explicit `false`, and a sample
  invoice that XRechnung accepts (BR-DE-2, PEPPOL-EN16931-R010/R020):
  https://github.com/beliq-eu/pipedream-beliq/pull/6
- [x] PDF output sends `template: "standard"` when no stored template is given,
  so XRechnung and Peppol BIS return a rendered visual instead of a 400:
  https://github.com/beliq-eu/pipedream-beliq/pull/7
- [x] Sample invoice GLNs (scheme 0088) carry a valid GS1 check digit, pinned by
  a test that transcribes PEPPOL-COMMON-R040:
  https://github.com/beliq-eu/pipedream-beliq/pull/9, its comment corrected in
  https://github.com/beliq-eu/pipedream-beliq/pull/14
- [x] This roadmap points at `beliq-hq/CONNECTORS-ROADMAP.md`
  (https://github.com/beliq-eu/pipedream-beliq/pull/8) and carries a status stamp
  (https://github.com/beliq-eu/pipedream-beliq/pull/15).
- [x] GitHub Actions pinned to commit SHAs
  (https://github.com/beliq-eu/pipedream-beliq/pull/10), then raised to the
  node24 runtimes, `actions/checkout` and `actions/setup-node` v7
  (https://github.com/beliq-eu/pipedream-beliq/pull/11).
- [x] `package-lock.json` committed and CI installs with `npm ci`:
  https://github.com/beliq-eu/pipedream-beliq/pull/12
- [x] `@beliq/sdk` 0.3.1 in the lockfile, which stops retrying a 429 that
  carries QUOTA_EXCEEDED (https://github.com/beliq-eu/pipedream-beliq/pull/13),
  then `^0.4.0` in both manifests with 0.4.0 locked
  (https://github.com/beliq-eu/pipedream-beliq/pull/22).
- [x] The live smoke drives the shipped prop default instead of its own copy,
  which had drifted and failed BR-DE-2. `npm test` no longer collects
  `test/integration.test.mjs`. `test/sample-invoice.test.mjs` gains 5 tests for
  the fields the XRechnung CIUS requires. CI gains a `preflight` job that reads
  the remaining allowance from the quota-exempt `GET /v1/me`, and a `live` job
  that runs `npm run test:integration` on pushes to `main`:
  https://github.com/beliq-eu/pipedream-beliq/pull/16
- [x] `scrub:check` runs `bash scripts/scrub-check.sh`, which `git grep`s the
  whole tree and fails when the grep itself fails. The old inline check used
  bash quoting under `/bin/sh` (dash on Ubuntu), so it could not match an
  em-dash:
  https://github.com/beliq-eu/pipedream-beliq/pull/20
- [x] `ci.yml` sets top-level `permissions: contents: read` and a
  `timeout-minutes` on every job (5 for `preflight`, 15 for `test` and `live`):
  https://github.com/beliq-eu/pipedream-beliq/pull/21
- [x] `.eslintrc.cjs` replaced by `eslint.config.mjs`, on eslint 10:
  https://github.com/beliq-eu/pipedream-beliq/pull/23
- [x] Renovate auto-merges patch, digest and security updates once CI is green:
  https://github.com/beliq-eu/pipedream-beliq/pull/24
- [x] vitest 4 (security update):
  https://github.com/beliq-eu/pipedream-beliq/pull/19

## Verified

Re-run on 2026-09-24 at `6a7d516`:

- `npm test`: 32 offline tests pass, 24 in `test/connector.test.mjs` and 8 in
  `test/sample-invoice.test.mjs`. The connector tests drive a real `@beliq/sdk`
  `Beliq` client over an injected recording `fetch` and write binary output to
  the real `/tmp`; only the network boundary is doubled. They assert prop ->
  SDK-call mapping, the wire request (URL, method, content type, body), response
  parsing, output shaping, error mapping, and that the option lists come from
  the SDK LIVE_* lists. The sample-invoice tests assert that the sample
  invoice's Peppol ids carry a valid GS1 check digit and differ between the
  parties, and that it carries the fields the XRechnung CIUS requires (BR-DE-1,
  BR-DE-2, BR-DE-15, BR-CO-13, BR-CO-15, BR-CO-18, BR-S-01). The `test` job of
  `main` CI run
  https://github.com/beliq-eu/pipedream-beliq/actions/runs/35747805951 reports
  the same 32 passed.
- `npm run test:integration`: 2 live smoke tests in `test/integration.test.mjs`,
  skipped when `BELIQ_API_KEY` is unset. Not run in this re-run, since it
  spends sandbox documents. The `live` job of the same CI run reports 2 passed.
- `npm run lint`: 0 errors, 5 advisory `default-value` warnings (genuinely
  optional props with no sensible default).
- `npm run scrub:check`: no em-dash.

## Distribution

- [x] Source repo LIVE: **https://github.com/beliq-eu/pipedream-beliq** (public,
  default branch `main`, committed as `beliq <hello@beliq.eu>`, pushed 2026-07-01
  with a pinned `beliq-eu` token; active gh account stayed `tobias-dev`).
- [x] App-integration request filed 2026-09-15:
  https://github.com/PipedreamHQ/pipedream/issues/21996. Still open with no
  comments on 2026-09-24. Pipedream integrates the app before it reviews the
  registry PR, so that PR waits for it (`beliq-hq/CONNECTORS-ROADMAP.md`,
  go-live row for pipedream-beliq).
- [ ] Open the registry PR to `PipedreamHQ/pipedream` (add the `beliq` app +
  the five actions under `components/beliq/`) once #21996 is done. The monorepo
  is large; add files via the Git Data API rather than a full clone, as done for
  polydoc.
- [ ] Pipedream must provision the `beliq` app auth (an `api_key` secret field
  and the connect-time test request) before the components are testable end to
  end and the PR can merge. Flag it in the PR body.
- [x] Wire `BELIQ_API_KEY` and run `npm run test:integration` against the live
  API. The repo secret is set and CI's `live` job runs the smoke on pushes to
  `main` (https://github.com/beliq-eu/pipedream-beliq/pull/16). First green
  live job: https://github.com/beliq-eu/pipedream-beliq/actions/runs/34070006074
  (2026-09-07); latest checked:
  https://github.com/beliq-eu/pipedream-beliq/actions/runs/35747805951
  (2026-09-22, at `6a7d516`). Both report 2 passed, not skipped.
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
