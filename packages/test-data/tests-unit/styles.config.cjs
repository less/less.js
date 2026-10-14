// Settings for every fixture under tests-unit/. A fixture folder's own
// styles.config overrides them. Flat output (collapseNesting: true) comes
// from the corpus root styles.config.ts.
//
// URL rewriting stays off: urls/urls.css keeps urls from imported files as
// they are written.
module.exports = {
  compile: {
    // The goldens leave a division outside parens unevaluated: calc/calc.css
    // keeps `50vh / 2`, and operations/operations-advanced.css keeps
    // `10px / 2` and `10 / 5`, as its Less 4.x output in legacy/ does.
    mathMode: 'parens-division'
  }
};
