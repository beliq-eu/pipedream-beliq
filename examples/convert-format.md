# Convert an invoice between formats

Convert a received invoice from one EN 16931 format to another, for example a
CII document to UBL, or a UBL document to a ZUGFeRD hybrid PDF.

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
   returns the path plus metadata, including any elements that could not be carried
   across (`lostElements`).

## Notes

- A conversion can be lossy when the target format cannot represent every source
  element. Check `lostElementsCount` in the result.
- `dropFranceCtcOverlay` drops the French CTC overlay when the target cannot hold it.
