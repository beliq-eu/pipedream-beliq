# Convert an invoice between formats

Convert a received invoice from one EN 16931 format to another, for example a
CII document to UBL, or a Factur-X PDF to UBL. An XML source converted to
ZUGFeRD or Factur-X comes back as CII XML; a PDF comes back only when a hybrid
PDF source is converted to one of them, and the result's `pdfNote` then says what
that PDF is.

## Steps

1. **Trigger**: A new file in storage, an inbound email attachment, or a webhook.
2. **Make the document reachable**: write it to `/tmp/source.xml`, or use its URL.
3. **beliq -> Convert Invoice**:
   - Input: `File`
   - File Path or URL: `/tmp/source.xml`
   - Source Format: `Auto-detect`
   - Target Format: `UBL` (or `ZUGFeRD` / `Factur-X` / `XRechnung` / `Peppol BIS`)
   - Target Profile: `EN 16931` (applies only to the Factur-X / ZUGFeRD family)
4. **Use the result**: the converted document is written to `/tmp` and the action
   returns the path plus metadata, including `lostElements`: the source elements the
   engine recorded as having no target equivalent. A loss the engine does not detect
   is not listed. Each entry has the `path`, `value`, `reason`, `severity`
   and `acceptableLoss` that
   [the LostElement schema](https://docs.beliq.eu/api-reference/convert/#lostelement-schema)
   describes. When the list would pass the API's 6 KB header cap, it holds one
   `{ "truncated": true }` entry instead of the losses, and `lostElementsCount` stays
   the exact count.

## Notes

- A conversion can be lossy when the target format cannot represent every source
  element. `lostElementsCount` counts the losses the engine recorded, so `0` does
  not prove that nothing was lost.
- `dropFranceCtcOverlay` drops the French CTC overlay when the target cannot hold it.
