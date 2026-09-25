# pipedream-beliq roadmap

`status: in progress: registry PR https://github.com/PipedreamHQ/pipedream/pull/22073 open and waiting for Pipedream to provision the beliq app; next: on or after 2026-10-01 merge #25, then #26, and confirm main's live job`

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

## In progress: registry pre-flight

https://github.com/beliq-eu/pipedream-beliq/pull/26 (branch `registry-preflight`,
cut from #25's `item-8f`, base `main`). CI green. **Held until 2026-10-01 and
merged after #25**, for the same reason as #25: every push to `main` runs the
`live` job and the shared sandbox allowance resets 2026-10-01T00:00Z.
`~/Projects/beliq/land-connectors-8f.sh` merges #25 but does not know about #26,
so #26 is merged by hand after it. The two share #25's ROADMAP/README hunks
verbatim, so #26 merges cleanly once #25 is squash-merged.

Why: Pipedream tightened its CodeRabbit rules after PolyDoc merged
(https://github.com/PipedreamHQ/pipedream/pull/22006 on 2026-09-22 and
https://github.com/PipedreamHQ/pipedream/pull/22061 on 2026-09-24, in that repo's
`.coderabbit.yaml` and `.github/pipedream-component-guidelines.md`), and the
component failed several. What #26 changes:

- [x] `ai: "optimized"` on every action; Validate and Parse `readOnlyHint: true`.
- [x] API calls through app methods (`getAccount`, `generateInvoice`,
  `validateInvoice`, `parseInvoice`, `convertInvoice`) and one private
  `_makeRequest`; no try/catch in `run()`.
- [x] Error messages carry the envelope's details: `validationResult.errors`
  (422 INVALID_INVOICE), `fields` (400 VALIDATION_ERROR), `unmappablePaths`
  (422 CONVERSION_LOSSY_FAILCLOSED), five at most, then the `(CODE)`.
- [x] File input is a `file-ref` prop read through `getFileStream` from
  `@pipedream/platform`; read `syncDir` on Validate/Parse, read-write on Convert.
  Convert gains the Filename prop its code already read.
- [x] Every prop description has an example; the Invoice description lists the
  required nested fields; PDF Template ID points at the dashboard's PDF Templates
  page (no public list route exists).
- [x] `common/options.mjs` -> `common/constants.mjs`, `common/client.mjs` ->
  `common/errors.mjs`, generic helpers in `common/utils.mjs`; malformed JSON is a
  `ConfigurationError` naming the field.
- [x] Registry-shape `components/beliq/package.json` (0.1.0, Pipedream homepage
  and author, `@pipedream/platform` dep); `@beliq/sdk` 0.4.2 locked, the version
  the registry lockfile resolves.
- [x] `eslint.config.mjs` carries the monorepo root's formatting rules.
- [x] `test/registry-rules.test.mjs` pins the review rules; the live smoke runs
  the actions and has a keyless wiring test that CI's `test` job runs.
- [x] The Invoice prop has no default any more (CodeRabbit's one finding on
  https://github.com/PipedreamHQ/pipedream/pull/22073): an agent that left it
  out got an invoice between two fictitious parties and spent a document. The
  sample moved to `common/constants.mjs` and is rendered into the description
  as a JSON block, pinned byte for byte to the sample the GS1, CIUS and live
  checks run on. PolyDoc's merged `invoice` prop has no default either.
- [ ] Merge on or after 2026-10-01, after #25; confirm `main`'s `live` job
  reports 2 passed (not skipped).

## Verified

Re-run on 2026-09-25 on branch `registry-preflight` (PR #26), after the
CodeRabbit fix:

- `npm test`: 75 offline tests pass: 33 in `test/connector.test.mjs`, 32 in
  `test/registry-rules.test.mjs`, 10 in `test/sample-invoice.test.mjs`. The
  connector tests run the real actions, app methods and `@beliq/sdk` client with
  only global `fetch` doubled (other URLs pass through to the real fetch), and
  write binary output to the real `/tmp`. They assert prop -> SDK-call mapping,
  the wire request (URL, method, content type, key header, body), response
  parsing, output shaping and summaries, error details, file-ref input from a
  real file and from a local HTTP server, and that the option lists come from
  the SDK LIVE_* lists. Each new assertion was checked against a planted defect. The sample-invoice tests assert that the sample
  invoice's Peppol ids carry a valid GS1 check digit and differ between the
  parties, and that it carries the fields the XRechnung CIUS requires (BR-DE-1,
  BR-DE-2, BR-DE-15, BR-CO-13, BR-CO-15, BR-CO-18, BR-S-01). The `test` job of
  PR #26's CI run
  https://github.com/beliq-eu/pipedream-beliq/actions/runs/36071480037 passes.
- `npm run test:integration`: without a key, 1 wiring test passes and the 2 live
  tests skip. The wiring test exists because vitest turns an import of a missing
  named export into `undefined`, so a skipped live suite never noticed one
  (planted and confirmed). Not run with a key in this re-run, since it spends
  sandbox documents; the last `main` live job before #26
  (https://github.com/beliq-eu/pipedream-beliq/actions/runs/35747805951, at
  `6a7d516`) reports 2 passed.
- `npm run lint`: 0 errors, 5 advisory `default-value` warnings (genuinely
  optional props with no sensible default).
- `npm run scrub:check`: no em-dash.

## Distribution

- [x] Source repo LIVE: **https://github.com/beliq-eu/pipedream-beliq** (public,
  default branch `main`, committed as `beliq <hello@beliq.eu>`, pushed 2026-07-01
  with a pinned `beliq-eu` token; active gh account stayed `tobias-dev`).
- [x] App-integration request filed 2026-09-15:
  https://github.com/PipedreamHQ/pipedream/issues/21996. No labels, comments or
  assignee by 2026-09-25.
- [x] **Decision 2026-09-25: stop waiting on #21996 and open the registry PR.**
  The PR template's "request the app first" line dates from 2026-04-29, and
  PolyDoc opened https://github.com/PipedreamHQ/pipedream/pull/21180 directly
  anyway: a maintainer provisioned the app from the PR 7 days later and it merged
  on day 10. The app-request backlog held 2470 open issues, with 46 filed and 5
  closed in the preceding 30 days.
- [x] Registry PR opened 2026-09-25:
  **https://github.com/PipedreamHQ/pipedream/pull/22073**, from the fork
  https://github.com/beliq-eu/pipedream branch `add-beliq-app` (commit
  `c173c422`, committed as `beliq <hello@beliq.eu>`), linked from #21996.
  `components/beliq` there is byte-identical to this repo's `components/beliq`
  at `8736527` (tree `6878407`). The body flags the app auth Pipedream must
  provision (one `api_key` secret field; `GET https://api.beliq.eu/v1/me` as the
  free connect test), explains the SDK instead of platform axios (precedent:
  the `stripe` and `openai` components), and names the one open check (the SDK
  declares `node >=20.15`).
  - How, for next time: a shallow, blobless, non-cone sparse clone
    (`--depth=1 --filter=blob:none --no-checkout`, patterns `/package.json
    /pnpm-lock.yaml /pnpm-workspace.yaml /.npmrc /.tool-versions
    **/package.json`) is 8.6 MB. Every workspace `package.json` has to be
    present, or `pnpm install --lockfile-only` deletes the missing packages'
    lockfile entries. Use the pinned `npx pnpm@10.28.2`.
  - A plain `pnpm install --lockfile-only` with the new importer also re-resolved
    unrelated peer contexts (5 lines removed around `ts-jest`, `@types/node`),
    while pristine `master` is stable under the same command. So the three
    beliq entries (importer, package, snapshot; +15/-0) were applied by hand to
    the pristine lockfile. pnpm accepts that file with `--frozen-lockfile`, and
    a fresh non-frozen resolve leaves it byte-identical.
  - The registry's `scripts/findBadKeys.js` and `checkComponentAppProp.js` print
    nothing for beliq; in a sparse tree they exit 1 only because the other
    3402 apps' files are absent.
- [ ] Registry CI on #22073 green. On 2026-09-25 only `Component Registry Version
  Check` had run (pass); `Pull Request Checks` and `Components Checks` report
  `action_required`, because a maintainer must approve workflow runs for a
  first-time fork contributor. Nothing to do on our side until they approve.
- [x] CodeRabbit's first pass on #22073 (2026-09-25): 1 actionable finding, the
  Invoice default, fixed in both `registry-preflight` (#26) and `add-beliq-app`
  and answered on the thread without marking it resolved (the PR template asks
  for that). Second pass (on `feb3fa9d`): 2 minor findings, both fixed. The
  Invoice description now lists all three ways a party's electronic address
  resolves (`peppol`, `email`, `vatId` + country) and says a cross-border EU
  sale is usually reverse charge (`AE`). The sample's buyer is now German, since
  19% German VAT on consulting for a French VAT-registered buyer was the wrong
  treatment. Third pass (on `86bd5d0b`): 1 minor finding, fixed. The description
  names the Peppol Directory as the source for a Peppol ID, and says to leave
  `peppol` out when none can be confirmed. Later CodeRabbit passes, and any
  maintainer review, get the same treatment.
- [ ] Pipedream provisions the `beliq` app (`https://pipedream.com/apps/beliq`
  answered 404 on 2026-09-25).
- [ ] After provisioning, expect a conflict on `components/beliq/`: PolyDoc's
  #21180 shows `polydoc.app.mjs` (+296 -4) and `package.json` (+5 -2) as
  modified, so the maintainer's scaffold landed on `master` first. Merge
  `master` into `add-beliq-app`, keep our files, adopt the scaffold's `$auth`
  field names. If the slug Pipedream picks is not `beliq`, rename `app:`, the
  directory and the `beliq-*` keys in both repos (`scripts/findBadKeys.js`
  checks them).
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
- The SDK uses `globalThis.fetch`, which Pipedream's Node 20+ runtime provides.
  The component depends on `@pipedream/platform` only for `getFileStream` and
  `ConfigurationError`.
- File input is a `file-ref` prop: a `/tmp` path or a URL, read through
  `getFileStream`. Binary output is written to the synced `/tmp` dir (the
  `syncDir` prop), since Pipedream steps return JSON.
- Known unknown: the Pipedream runtime's Node version. The SDK declares
  `node >=20.15`; the monorepo's `.tool-versions` pins `nodejs 20.13.1` for its
  own tooling, and its `.npmrc` has `engine-strict=false`, so pnpm only warns.
  Settled by the first real workflow run after provisioning.

## Parked / out of scope

- Four stale remote branches on `beliq-eu/pipedream-beliq`:
  `canonical-invoice-fixture`, `eslint-flat-config`, `status-convention-pass-6`,
  `track-lockfile-npm-ci`. Check each one's PR is merged, then delete it. Repo
  hygiene, about 5 minutes, blocks nothing.
- Whether `@beliq/sdk` really needs Node 20.15 or could declare a lower floor
  (repo `beliq-eu/beliq-sdk-node`, `package.json` `engines`). Only matters if
  the Pipedream runtime turns out older; about an hour to check. Blocks nothing
  today.
