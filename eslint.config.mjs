import js from "@eslint/js";
import globals from "globals";
import pipedream from "@pipedream/eslint-plugin-pipedream";

export default [
  {
    ignores: [
      "node_modules/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: {
      "@pipedream/pipedream": pipedream,
    },
    rules: {
      // Apply to every component file (app, common, actions).
      "@pipedream/pipedream/props-label": "error",
      "@pipedream/pipedream/props-description": "error",
      "@pipedream/pipedream/no-ts-version": "error",
      // Advisory: conditional props (text vs file) have no sensible default.
      "@pipedream/pipedream/default-value-required-for-optional-props": "warn",
    },
  },
  {
    // The PipedreamHQ/pipedream root eslint.config.mjs formatting rules, copied
    // verbatim so a clean local lint is a clean registry lint. Re-copy them
    // when the registry PR's lint check reports a rule missing here.
    rules: {
      "arrow-parens": "error",
      "arrow-spacing": "error",
      "array-bracket-newline": [
        "error",
        {
          minItems: 1,
        },
      ],
      "array-element-newline": [
        "error",
        "always",
      ],
      "comma-dangle": [
        "error",
        "always-multiline",
      ],
      "comma-spacing": "error",
      "eol-last": "error",
      "function-call-argument-newline": [
        "error",
        "consistent",
      ],
      "function-paren-newline": [
        "error",
        "consistent",
      ],
      "indent": [
        "error",
        2,
      ],
      "key-spacing": "error",
      "keyword-spacing": "error",
      "max-len": [
        "error",
        {
          code: 100,
          tabWidth: 2,
          ignoreTrailingComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "multiline-ternary": [
        "error",
        "always",
      ],
      "newline-per-chained-call": "error",
      "no-constant-condition": [
        "error",
        {
          checkLoops: false,
        },
      ],
      "no-multiple-empty-lines": [
        "error",
        {
          max: 1,
          maxBOF: 0,
          maxEOF: 1,
        },
      ],
      "no-trailing-spaces": "error",
      "no-unused-vars": "error",
      "object-curly-newline": [
        "error",
        {
          ExportDeclaration: "always",
          ImportDeclaration: {
            minProperties: 2,
            multiline: true,
          },
          ObjectExpression: {
            minProperties: 1,
            multiline: true,
          },
          ObjectPattern: {
            minProperties: 2,
            multiline: true,
          },
        },
      ],
      "object-curly-spacing": [
        "error",
        "always",
      ],
      "object-property-newline": [
        "error",
        {
          allowAllPropertiesOnSameLine: false,
        },
      ],
      "quote-props": [
        "error",
        "consistent",
      ],
      "quotes": "error",
      "semi": "error",
      "space-before-blocks": [
        "error",
        "always",
      ],
      "space-infix-ops": "error",
    },
  },
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
];
