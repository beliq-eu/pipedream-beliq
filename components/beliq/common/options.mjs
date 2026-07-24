import {
  LIVE_CONVERT_SOURCE_FORMATS,
  LIVE_CONVERT_TARGET_FORMATS,
  LIVE_GENERATE_PRESETS,
  LIVE_GENERATE_STANDARDS,
  LIVE_PARSE_FORMATS,
  LIVE_PROFILES,
  LIVE_VALIDATE_FORMATS,
} from "@beliq/sdk";

// Dropdown value-spaces are sourced straight from the SDK's LIVE_* lists, the
// publicly-offered subset of the beliq coverage SSOT. Provisional formats the
// API can technically accept stay out of the UI (LPD-1); reach them through the
// Advanced (JSON) field. Labels here are cosmetic only.
const LABELS = {
  auto: "Auto-detect",
  cii: "CII",
  ubl: "UBL",
  xrechnung: "XRechnung",
  zugferd: "ZUGFeRD",
  facturx: "Factur-X",
  "peppol-bis": "Peppol BIS",
  basicwl: "BASIC WL",
  en16931: "EN 16931",
  extended: "EXTENDED",
  "extended-ctc-fr": "EXTENDED CTC FR",
};

/** Map a list of API values to Pipedream `{ label, value }` dropdown options. */
export function toOptions(values) {
  return values.map((value) => ({
    label: LABELS[value] ?? value,
    value,
  }));
}

// Curated profile presets (e.g. NLCIUS = Peppol BIS + the netherlands-nlcius
// profile) are offered as extra generate targets beside the plain standards; a
// profile preset resolves to its standard + profile at call time.
const PROFILE_PRESETS = LIVE_GENERATE_PRESETS.filter((p) => p.profile);

export const STANDARD_OPTIONS = [
  ...toOptions(LIVE_GENERATE_STANDARDS),
  ...PROFILE_PRESETS.map((p) => ({
    label: p.label,
    value: p.id,
  })),
];

/** Resolve a Standard-dropdown value to the generate standard (and profile) it means. */
export function resolveGenerateTarget(value) {
  const preset = PROFILE_PRESETS.find((p) => p.id === value);
  if (preset) {
    return {
      standard: preset.standard,
      profile: preset.profile,
      output: preset.output,
    };
  }
  return { standard: value };
}

export const PROFILE_OPTIONS = toOptions(LIVE_PROFILES);
export const VALIDATE_FORMAT_OPTIONS = toOptions(LIVE_VALIDATE_FORMATS);
export const PARSE_FORMAT_OPTIONS = toOptions(LIVE_PARSE_FORMATS);
export const CONVERT_SOURCE_OPTIONS = toOptions(LIVE_CONVERT_SOURCE_FORMATS);
export const CONVERT_TARGET_OPTIONS = toOptions(LIVE_CONVERT_TARGET_FORMATS);

export const OUTPUT_OPTIONS = [
  {
    label: "XML",
    value: "xml",
  },
  {
    label: "PDF (hybrid PDF/A-3)",
    value: "pdf",
  },
];

export const INPUT_SOURCE_OPTIONS = [
  {
    label: "Text (paste the XML)",
    value: "text",
  },
  {
    label: "File (a /tmp path or a URL)",
    value: "file",
  },
];

export const CONTENT_TYPE_OPTIONS = [
  {
    label: "Auto-detect",
    value: "auto",
  },
  {
    label: "XML",
    value: "application/xml",
  },
  {
    label: "PDF",
    value: "application/pdf",
  },
];

/** Profiles only apply to the Factur-X / ZUGFeRD hybrid family. */
export function isFacturxFamily(standardOrFormat) {
  return standardOrFormat === "facturx" || standardOrFormat === "zugferd";
}
