import beliq from "../../beliq.app.mjs";
import {
  asJsonObject, mapError,
} from "../../common/client.mjs";
import {
  resolveDocument, writeDocument,
} from "../../common/io.mjs";
import { isFacturxFamily } from "../../common/options.mjs";

/**
 * Convert an invoice document from one EN 16931 format to another and write the
 * result to the synced /tmp dir. Unit-testable with a real SDK client.
 */
export async function runConvert(client, props) {
  const {
    bytes, contentType,
  } = await resolveDocument(props);
  const targetFormat = props.targetFormat;
  const options = {
    targetFormat,
    sourceFormat: props.sourceFormat,
    dropFranceCtcOverlay: props.dropFranceCtcOverlay === true,
    contentType,
    advanced: asJsonObject(props.advanced),
  };
  if (isFacturxFamily(targetFormat) && props.targetProfile) {
    options.targetProfile = props.targetProfile;
  }

  let result;
  try {
    result = await client.convert(bytes, options);
  } catch (error) {
    throw mapError(error);
  }
  return writeDocument(result, "converted", props.filename);
}

export default {
  key: "beliq-convert-invoice",
  name: "Convert Invoice",
  description: "Convert an invoice document from one EN 16931 format to another. [See the documentation](https://docs.beliq.eu).",
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
    sourceFormat: {
      propDefinition: [
        beliq,
        "sourceFormat",
      ],
    },
    targetFormat: {
      propDefinition: [
        beliq,
        "targetFormat",
      ],
    },
    targetProfile: {
      propDefinition: [
        beliq,
        "targetProfile",
      ],
    },
    dropFranceCtcOverlay: {
      propDefinition: [
        beliq,
        "dropFranceCtcOverlay",
      ],
    },
    advanced: {
      propDefinition: [
        beliq,
        "advanced",
      ],
    },
    syncDir: {
      type: "dir",
      accessMode: "write",
      sync: true,
    },
  },
  async run({ $ }) {
    const out = await runConvert(this.beliq.client(), this);
    $.export("$summary", `Converted to ${out.fileName} (${out.sizeBytes} bytes)`);
    return out;
  },
};
