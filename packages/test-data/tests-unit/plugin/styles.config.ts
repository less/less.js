/**
 * `@plugin` fixtures load their scripts through the compiler's plugin resolver.
 * Do not `require()` them while loading test configuration: those scripts are
 * intentionally evaluated with the plugin-scoped Less globals (`functions`,
 * `tree`, and `registerPlugin`), not with Node globals.
 */
export default {
  output: {
    collapseNesting: true
  }
};
