module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: [
    "@pipedream/pipedream",
  ],
  extends: [
    "eslint:recommended",
  ],
  rules: {
    // Apply to every component file (app, common, actions).
    "@pipedream/pipedream/props-label": "error",
    "@pipedream/pipedream/props-description": "error",
    "@pipedream/pipedream/no-ts-version": "error",
    // Advisory: conditional props (text vs file) have no sensible default.
    "@pipedream/pipedream/default-value-required-for-optional-props": "warn",
  },
  overrides: [
    {
      // Component metadata + annotations only apply to action / source files,
      // not the app handle or shared common/ helpers.
      files: [
        "**/actions/**/*.mjs",
        "**/sources/**/*.mjs",
      ],
      rules: {
        "@pipedream/pipedream/required-properties-key": "error",
        "@pipedream/pipedream/required-properties-name": "error",
        "@pipedream/pipedream/required-properties-version": "error",
        "@pipedream/pipedream/required-properties-description": "error",
        "@pipedream/pipedream/required-properties-type": "error",
        "@pipedream/pipedream/action-annotations": "error",
      },
    },
  ],
};
