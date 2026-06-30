# Generate a hybrid PDF/A-3 e-invoice

Turn structured invoice data (from a CRM, a billing system, or a form) into a
compliant ZUGFeRD / Factur-X hybrid PDF.

## Steps

1. **Trigger**: New record in your billing tool, or a scheduled run.
2. **Shape the invoice** (optional code step): map your record to the beliq
   EN 16931 invoice object (`number`, `issueDate`, `currencyCode`, `seller`,
   `buyer`, `lines`, totals).
3. **beliq -> Generate Invoice**:
   - Standard: `ZUGFeRD` (or `Factur-X`)
   - Output: `PDF (hybrid PDF/A-3)`
   - Factur-X / ZUGFeRD Profile: `EN 16931`
   - Invoice: the object from step 2
   - Validate Result: on (fails closed if the generated document is not compliant)
4. **Deliver**: the step returns the file path in `/tmp` plus metadata. Attach
   the file to an email step, upload it to storage, or send it onward.

## Notes

- For a pure XML e-invoice, set Output to `XML`; the action also returns the XML
  string in the result.
- Render the PDF from a saved dashboard layout by setting `PDF Template ID`.
