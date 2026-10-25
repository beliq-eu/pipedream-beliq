# Validate an incoming invoice

Check an invoice received by email or webhook against the rules beliq checks for
its format before it enters your accounting flow.

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
4. **Branch on the verdict**: the step returns the API's result, among it `valid`,
   `format`, `errors[]`, `warnings[]` and `verificationBadgeLabel` (the check depth
   the API states; absent when it states none). Route invalid documents, and any
   with `franceCtcBlockingRuleIds`, to a notification step and pass the others
   downstream. A France CTC block ends a transmission even where `valid` is true.

## Notes

- `franceCtc` adds the French CTC (Flux 2) overlay when you need it.
- Validation consumes one request from your monthly quota.
