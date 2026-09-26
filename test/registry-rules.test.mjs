import {
  describe, expect, it,
} from "vitest";
import app from "../components/beliq/beliq.app.mjs";
import generateInvoice from "../components/beliq/actions/generate-invoice/generate-invoice.mjs";
import validateInvoice from "../components/beliq/actions/validate-invoice/validate-invoice.mjs";
import parseInvoice from "../components/beliq/actions/parse-invoice/parse-invoice.mjs";
import convertInvoice from "../components/beliq/actions/convert-invoice/convert-invoice.mjs";
import checkAccount from "../components/beliq/actions/check-account/check-account.mjs";

// The review rules PipedreamHQ/pipedream applies to every registry PR
// (.coderabbit.yaml and .github/pipedream-component-guidelines.md in that repo),
// pinned here so a change that breaks one fails in this repo, before review.

const ACTIONS = [
  generateInvoice,
  validateInvoice,
  parseInvoice,
  convertInvoice,
  checkAccount,
];
const ACTION_NAMES = ACTIONS.map((a) => a.name);
const EXAMPLE = /e\.g\.|Example:/;

// A prop's description, whether inline or through a propDefinition on the app.
function describedProps(action) {
  return Object.entries(action.props)
    .filter(([
      name,
    ]) => name !== "beliq" && name !== "syncDir")
    .map(([
      name,
      prop,
    ]) => {
      const key = prop.propDefinition?.[1];
      return [
        name,
        prop.description ?? app.propDefinitions[key]?.description,
      ];
    });
}

describe.each(ACTIONS.map((a) => [
  a.key,
  a,
]))("%s", (key, action) => {
  it("declares ai: \"optimized\"", () => {
    expect(action.ai).toBe("optimized");
  });

  it("declares all three annotations as booleans", () => {
    for (const hint of [
      "destructiveHint",
      "openWorldHint",
      "readOnlyHint",
    ]) {
      expect(typeof action.annotations?.[hint]).toBe("boolean");
    }
  });

  it("ends its description with a documentation link", () => {
    expect(action.description).toMatch(/\[See the documentation\]\(https:\/\/[^)]+\)$/);
  });

  it("names no HTTP method or endpoint path in its description", () => {
    expect(action.description).not.toMatch(/\b(GET|POST|PUT|PATCH|DELETE)\b|\/v1\//);
  });

  it("cross-references only actions that exist", () => {
    const referenced = [
      ...action.description.matchAll(/\*\*([^*]+)\*\*/g),
    ].map((m) => m[1]);
    for (const name of referenced) {
      expect(ACTION_NAMES).toContain(name);
    }
  });

  it("gives every prop description a concrete example", () => {
    for (const [
      name,
      description,
    ] of describedProps(action)) {
      expect(description, name).toMatch(EXAMPLE);
    }
  });
});

describe("app propDefinitions", () => {
  it("give every description a concrete example", () => {
    for (const [
      name,
      prop,
    ] of Object.entries(app.propDefinitions)) {
      expect(prop.description, name).toMatch(EXAMPLE);
    }
  });

  it("cross-reference only actions that exist", () => {
    for (const prop of Object.values(app.propDefinitions)) {
      for (const [
        , name,
      ] of prop.description.matchAll(/\*\*([^*]+)\*\*/g)) {
        expect(ACTION_NAMES).toContain(name);
      }
    }
  });
});
