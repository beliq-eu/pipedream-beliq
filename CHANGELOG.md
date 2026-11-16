# Changelog

Each action carries its own version, so the headings here are dates, and each
entry names the action versions it changes. This file starts on 2026-11-06,
and earlier changes are in the git history. Dates are the commit date of the
version change, in UTC.

## 2026-11-16

- Generate Invoice 0.2.0, Validate Invoice 0.2.0, Parse Invoice 0.1.0 and
  Convert Invoice 0.3.0 add **Retry for up to (seconds)**, 5 by default. Each
  attempt ends after 20 seconds, so a step ends inside a workflow's default
  30-second timeout. Before, a step retried 3 times with waits of up to 30
  seconds each, so the workflow's timeout could end it before beliq's error
  came back.
- Every action: when beliq is unavailable and asks for a longer wait than the
  setting allows, the error starts with `beliq is unavailable for now` and
  says how many seconds to wait. An error with a `Retry-After`, such as a 429
  `RATE_LIMITED`, names the wait too.
- Check Account 0.0.2 retries for 5 seconds, with the same 20-second attempts.
- On `@beliq/sdk` 0.7.3.

## 2026-11-06

- Breaking: Convert Invoice 0.2.0 lists each `lostElements` entry as an object
  with `path`, `value`, `reason`, `severity` and `acceptableLoss`, as the API
  sends it. Before, each entry was the string `[object Object]`. When the list
  would pass the 6 KB header cap, it holds one `{ truncated: true }` entry
  instead, and `lostElementsCount` stays the exact count.
- Validate Invoice 0.1.1: the Format dropdown adds FatturaPA (Italy), Facturae
  (Spain), e-SLOG (Slovenia) and KSeF FA(3) (Poland), with the values
  `fatturapa`, `facturae`, `eslog` and `poland_ksef_fa3`. The last is checked
  as KSeF FA(3) (provisional, structure-checked). Beliq does not operate KSeF
  submission: transmission via your chosen intermediary.
- Unchanged: Generate Invoice 0.1.0, Parse Invoice 0.0.2, Check Account 0.0.1.
