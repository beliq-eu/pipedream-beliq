# Changelog

Each action carries its own version, so the headings here are dates, and each
entry names the action versions it changes. This file starts on 2026-11-06.
Earlier changes, all made before any action version was published, are in the
git history. Dates are the commit date of the version change, in UTC.

## 2026-11-06

- Breaking: Convert Invoice 0.2.0 lists each `lostElements` entry as an object
  with `path`, `value`, `reason`, `severity` and `acceptableLoss`, as the API
  sends it. Before, each entry was the string `[object Object]`. When the list
  would pass the API's 6 KB header cap, it holds one `{ truncated: true }`
  entry instead, and `lostElementsCount` stays the exact count.
- Validate Invoice 0.1.1: the Format dropdown adds FatturaPA (Italy), Facturae
  (Spain), e-SLOG (Slovenia) and KSeF FA(3) (Poland), with the values
  `fatturapa`, `facturae`, `eslog` and `poland_ksef_fa3`.
- Unchanged: Generate Invoice 0.1.0, Parse Invoice 0.0.2, Check Account 0.0.1.
