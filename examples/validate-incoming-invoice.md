# Validate an incoming invoice

Check that an invoice received by email or webhook is EN 16931 compliant before
it enters your accounting flow.

## Steps

1. **Trigger**: New inbound email (with attachment) or an HTTP webhook.
2. **Write the attachment to /tmp** (if the source gives you a URL or raw bytes):
   a code step or the built-in file helper saves it, for example to
   `/tmp/incoming.xml`.
3. **beliq -> Validate Invoice**:
   - Input: `File`
   - File Path or URL: `/tmp/incoming.xml` (or the attachment URL directly)
   - Content Type: `Auto-detect`
   - Format: `Auto-detect`
4. **Branch on the verdict**: the step returns `{ valid, format, errors[], warnings[] }`.
   Route invalid documents to a notification step and pass valid ones downstream.

## Notes

- `franceCtc` adds the French CTC (Flux 2) overlay when you need it.
- Validation consumes one request from your monthly quota.
