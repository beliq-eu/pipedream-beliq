import app from "../components/beliq/beliq.app.mjs";

/**
 * Run an action the way Pipedream runs a step: `this` carries the prop values
 * and the `beliq` app prop (its methods plus the connected account's `$auth`),
 * and `run` gets a `$` whose `export` records the step summary.
 */
export async function runAction(action, props, apiKey = "test-key") {
  const exports = {};
  const $ = {
    export: (key, value) => {
      exports[key] = value;
    },
  };
  const beliq = {
    ...app.methods,
    $auth: {
      api_key: apiKey,
    },
  };
  const result = await action.run.call({
    beliq,
    ...props,
  }, {
    $,
  });
  return {
    result,
    summary: exports.$summary,
  };
}
