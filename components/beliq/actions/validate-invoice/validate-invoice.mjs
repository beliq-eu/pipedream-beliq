import beliq from "../../beliq.app.mjs";
import {
  asJsonObject, mapError,
} from "../../common/client.mjs";
import { resolveDocument } from "../../common/io.mjs";

/**
 * Validate an XML or PDF invoice against beliq's authority-pinned rules and
 * return the structured verdict. Unit-testable with a real SDK client.
 */
export async function runValidate(client, props) {
  const {
    bytes, contentType,
  } = await resolveDocument(props);
  try {
    return await client.validate(bytes, {
      format: props.format,
      franceCtc: props.franceCtc === true,
      contentType,
      advanced: asJsonObject(props.advanced),
    });
  } catch (error) {
    throw mapError(error);
  }
}

export default {
  key: "beliq-validate-invoice",
  name: "Validate Invoice",
  description: "Check an XML or PDF invoice against beliq authority-pinned rules. [See the documentation](https://docs.beliq.eu).",
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
        "validateFormat",
      ],
    },
    franceCtc: {
      propDefinition: [
        beliq,
        "franceCtc",
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
    const result = await runValidate(this.beliq.client(), this);
    const errorCount = Array.isArray(result.errors)
      ? result.errors.length
      : 0;
    $.export("$summary", result.valid
      ? "Document is valid"
      : `Document is invalid (${errorCount} ${errorCount === 1
        ? "error"
        : "errors"})`);
    return result;
  },
};
