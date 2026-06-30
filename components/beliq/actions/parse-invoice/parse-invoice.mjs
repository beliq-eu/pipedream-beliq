import beliq from "../../beliq.app.mjs";
import {
  asJsonObject, mapError,
} from "../../common/client.mjs";
import { resolveDocument } from "../../common/io.mjs";

/**
 * Extract a structured EN 16931 invoice object from an XML or PDF document.
 * Unit-testable with a real SDK client.
 */
export async function runParse(client, props) {
  const {
    bytes, contentType,
  } = await resolveDocument(props);
  try {
    return await client.parse(bytes, {
      format: props.format,
      contentType,
      advanced: asJsonObject(props.advanced),
    });
  } catch (error) {
    throw mapError(error);
  }
}

export default {
  key: "beliq-parse-invoice",
  name: "Parse Invoice",
  description: "Extract a structured EN 16931 invoice object from an XML or PDF document. [See the documentation](https://docs.beliq.eu).",
  version: "0.0.1",
  type: "action",
  annotations: {
    destructiveHint: false,
    openWorldHint: true,
    readOnlyHint: false,
  },
  props: {
    beliq,
    inputSource: {
      propDefinition: [
        beliq,
        "inputSource",
      ],
    },
    documentText: {
      propDefinition: [
        beliq,
        "documentText",
      ],
    },
    filePath: {
      propDefinition: [
        beliq,
        "filePath",
      ],
    },
    contentType: {
      propDefinition: [
        beliq,
        "contentType",
      ],
    },
    format: {
      propDefinition: [
        beliq,
        "parseFormat",
      ],
    },
    advanced: {
      propDefinition: [
        beliq,
        "advanced",
      ],
    },
  },
  async run({ $ }) {
    const result = await runParse(this.beliq.client(), this);
    $.export("$summary", "Parsed the invoice document");
    return result;
  },
};
