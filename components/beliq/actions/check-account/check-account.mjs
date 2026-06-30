import beliq from "../../beliq.app.mjs";
import { mapError } from "../../common/client.mjs";

/**
 * Read the account, plan, and quota context for the connected key. Hits
 * GET /v1/me, a no-quota credential check, so it never touches the monthly
 * quota. Unit-testable with a real SDK client.
 */
export async function runCheckAccount(client) {
  try {
    const account = await client.me();
    return {
      success: true,
      account,
    };
  } catch (error) {
    throw mapError(error);
  }
}

export default {
  key: "beliq-check-account",
  name: "Check Account",
  description: "Verify the connected API key and read its account, plan, and quota. Does not consume quota. [See the documentation](https://docs.beliq.eu).",
  version: "0.0.1",
  type: "action",
  annotations: {
    destructiveHint: false,
    openWorldHint: true,
    readOnlyHint: true,
  },
  props: {
    beliq,
  },
  async run({ $ }) {
    const result = await runCheckAccount(this.beliq.client());
    $.export("$summary", "beliq API key is valid");
    return result;
  },
};
