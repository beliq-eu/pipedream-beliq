import beliq from "../../beliq.app.mjs";
import {
  asJsonObject, mapError,
} from "../../common/client.mjs";
import { writeDocument } from "../../common/io.mjs";
import { resolveGenerateTarget, usableFacturxProfile } from "../../common/options.mjs";

/**
 * Build a compliant e-invoice from an EN 16931 object and write the result to
 * the synced /tmp dir. Pure of Pipedream specifics so it is unit-testable with
 * a real SDK client over an injected fetch.
 */
export async function runGenerate(client, props) {
  const target = resolveGenerateTarget(props.standard);
  const input = {
    standard: target.standard,
    invoice: asJsonObject(props.invoice) ?? {},
    output: target.output ?? props.output ?? "xml",
    // The API validates before returning unless told not to. An absent prop is
    // the default, not an opt-out, so only an explicit false turns it off.
    verify: props.verify !== false,
    advanced: asJsonObject(props.advanced),
  };
  if (target.profile) {
    input.profile = target.profile;
  } else if (usableFacturxProfile(target.standard, props.facturxProfile)) {
    input.facturxProfile = props.facturxProfile;
  }
  const pdfTemplateId = (props.pdfTemplateId ?? "").trim();
  if (pdfTemplateId) {
    input.pdfTemplateId = pdfTemplateId;
  }

  let result;
  try {
    result = await client.generate(input);
  } catch (error) {
    throw mapError(error);
  }

  const out = await writeDocument(result, "invoice", props.filename);
  if (result.xml) {
    out.xml = result.xml;
  }
  return out;
}

export default {
  key: "beliq-generate-invoice",
  name: "Generate Invoice",
  description: "Build a compliant e-invoice document (XML or hybrid PDF/A-3) from an EN 16931 invoice object. [See the documentation](https://docs.beliq.eu).",
  version: "0.0.1",
  type: "action",
  annotations: {
    destructiveHint: false,
    openWorldHint: true,
    readOnlyHint: false,
  },
  props: {
    beliq,
    standard: {
      propDefinition: [
        beliq,
        "standard",
      ],
    },
    output: {
      propDefinition: [
        beliq,
        "output",
      ],
    },
    facturxProfile: {
      propDefinition: [
        beliq,
        "facturxProfile",
      ],
    },
    invoice: {
      propDefinition: [
        beliq,
        "invoice",
      ],
    },
    verify: {
      propDefinition: [
        beliq,
        "verify",
      ],
    },
    pdfTemplateId: {
      propDefinition: [
        beliq,
        "pdfTemplateId",
      ],
    },
    filename: {
      propDefinition: [
        beliq,
        "filename",
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
    const out = await runGenerate(this.beliq.client(), this);
    $.export("$summary", `Generated ${out.filename} (${out.sizeBytes} bytes)`);
    return out;
  },
};
