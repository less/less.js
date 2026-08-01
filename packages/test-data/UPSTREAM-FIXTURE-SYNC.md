# Upstream Fixture Sync Notes

## Verification snapshot

Rechecked on 2026-07-29 from PR #19 head `4abb411c` after fetching `origin`
and `upstream`:

- `origin/less-5-alpha.1` is also `4abb411c`.
- `upstream/alpha` is `330e9d71`; `HEAD...upstream/alpha` is `125 0`.
- `upstream/master` is `89c33e09`; `HEAD...upstream/master` is `108 40`.

The fixture/test-data commits in `8ae2cc3b..upstream/master` are the entries
classified below: #4462, #4461, #4469, #4472, #4473, #4477, and #4479, plus
release metadata commits #4463, #4471, #4475, and #4482. No additional
upstream fixture commit is currently unclassified for alpha.1.

## PR #19 scout list

- `48a386f6` selector regression: ported in `tests-unit/selectors`.
- `da514037` media parenthesis regression: ported in `tests-unit/media`.
- `d250d620` function/condition regressions: ported in `tests-unit/functions`
  and `tests-unit/mixins-guards`.
- `6161ecf2` inline condition-expression comparison:
  `boolean((2 > 1) = (3 > 2))` is intentionally out of scope for alpha.1;
  Jess currently reports `Direct Less comparison requires value operands`.
- `ea62d748` container mixin parameter regression: ported in
  `tests-unit/container`; bare container-name variables use interpolation form
  for the Less 5 alpha deprecation contract.
- `888f6877` container name regressions: simple camelCase, underscore, and
  non-ASCII names are ported. Comma-list container queries, `style(...)`
  feature functions, custom-ident names such as `--body`, and escaped names
  such as `contact\.body` remain out of scope for alpha.1.
- `d38b43a1` container `style()` comparison/range syntax is intentionally out
  of scope for alpha.1; those inputs are parser errors in the current Jess-backed
  Less wrapper.
- `83bc8d40` color `calc()` regression: ported in
  `tests-unit/color-functions/modern`.
- `c58808fd` and `8e1105f0` bare `@var` deprecation/migration: the migration
  fixtures are ported to interpolation-positive coverage. The upstream Less 4
  parser deprecation warning matrix is intentionally not active for alpha.1;
  the Jess-backed wrapper exposes a different structured-warning path.
- `6b04d2d6` named-args mixin arity regression: ported in
  `tests-unit/mixins-named-args`.
- `d6b20eee` variadic default forwarding regression is intentionally out of
  scope for alpha.1. The current alpha wrapper renders an unset forwarded rest
  argument as an empty value rather than falling through to the callee default.
- `1ee86aa3` CSS-var math regression: ported in `tests-unit/math-css-vars` with
  Less 5 alpha expected output. Upstream's Less 4 `percentage(var(--x))` error
  fixture is not active locally because the alpha wrapper currently leaves that
  call for browser runtime CSS.

Package metadata, release notes, lockfile churn, and Less 4 parser/runtime
source changes from upstream/master are intentionally out of scope for this
alpha fixture sync.
