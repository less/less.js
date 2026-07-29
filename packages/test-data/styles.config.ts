/**
 * Top-level default config for the Less.js fixture corpus.
 *
 * Provides the flat-output default (`collapseNesting: true`) that the Jess
 * all-less harness applies as the base of the config cascade, so it no longer
 * has to hardcode that default. Fixture-directory `styles.config.*` files
 * (nearest ancestor, resolved via cosmiconfig walk-up) override this per
 * directory; anything without an explicit `collapseNesting` inherits this flat
 * default.
 */
export default {
  output: {
    collapseNesting: true
  }
};
