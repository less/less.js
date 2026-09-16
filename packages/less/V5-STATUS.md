# Less 5 (alpha) — feature status

Less 5 is a from-scratch compiler (the [Jess](https://github.com/jesscss/jess)
engine) behind the same `less.render(input, options)` / `lessc` interface Less 4
users know. This page tracks what the current alpha supports, what is still in
progress, and what will **intentionally not** be carried over from Less 4 — and
why.

> **Status:** alpha, published under the npm `alpha` dist-tag
> (`npm install less@alpha`). APIs and output may still change. This document is
> kept honest by the `packages/less` alpha test suite; if a claim here drifts
> from behavior, the suite should catch it.

The one headline behavior change: **Less 5 preserves your authored nesting by
default** (it emits nested CSS) instead of always flattening. Opt into flattened
output with `collapseNesting` (below).

---

## ✅ Implemented

Works today through `less.render(...)` and `lessc`.

- **Core compilation** — variables, mixins (including guards and named args),
  operations, functions, `@import`, nesting, `&`, `:extend`, and the Less
  builtin function library.
- **Nested output** — authored nesting is preserved by default (modern CSS
  nesting). This is the main difference from Less 4.
- **`collapseNesting`** — flatten the output instead. `false` (default, keep
  nesting), `'native'` (the CSS-nesting desugaring — parent wrapped in `:is()`,
  child selector lists distributed, so each branch keeps its own specificity,
  matching the browser and Less 4), or `'compact'` (like `'native'` but also
  folds same-combinator descendant runs into one `:is()`).
- **`math`** — `'always'`, `'parens-division'` (default), `'parens'`.
- **`unitMode`** — `'loose'` | `'preserve'` (default) | `'strict'`.
  `strictUnits: true` is a deprecated alias for `'strict'`.
- **Source maps** — `sourceMap: true` (or the object form / the legacy flat
  `sourceMap*` options) returns the map as `result.map`, writes the
  `sourceMappingURL` annotation when a URL or inline map is requested, and
  embeds source content with `outputSourceFiles`.
- **URL rewriting** — `rootpath`, `rewriteUrls` (`'all'`/`'local'`/`'off'`), and
  `urlArgs` rewrite `url(...)` references.
- **`compress`** — minified output.
- **Function plugins** — `@plugin "file"` scripts that register custom
  functions (via `functions.add` / `addMultiple`), through the opt-in
  `@jesscss/plugin-less-compat` layer. This is the common `@plugin` shape.
- **npm imports** — importing from `node_modules` packages (the
  `less-plugin-npm-import` case) is native via `@jesscss/plugin-node-modules`.
- **Diagnostics** — errors report `file:line:column` with a source excerpt and
  caret, not raw parser offsets.
- **Browser build** — a browser bundle (`npm run build:browser`) that defines
  `window.less` with the same render API; it powers the online playground.

---

## ⏳ In progress / not yet

Planned, but not complete in the current alpha.

- **Source-map path variants** — maps are produced and valid, but the
  source-path normalization for `sourceMapBasepath` / `sourceMapRootpath` /
  include-source is not yet byte-identical to Less 4.
- **Remote imports** — importing from `http(s)` URLs is gated behind an explicit
  network policy and is not enabled by default.
- **Module member access** — `@use` / `@compose` member access (namespaced
  functions/mixins) is designed but not yet wired.

---

## ❌ Intentionally not (and why)

Deliberately not carried into Less 5. Each has a rationale and, where relevant, a
replacement.

- **`@media` query merging** — a nested `@media (a) { @media (b) { … } }` is
  emitted **nested**, not rewritten to `@media (a) and (b)`. The 4.x merge was a
  workaround for engines that could not nest conditional group rules; modern CSS
  nests them natively.
- **Inline JavaScript (backticks)** — ``@v: `...js...` `` is removed. Use a
  script module (`@use`) for computed values.
- **IE `progid:` / `filter` hacks** — the legacy IE-specific filter handling is
  removed.
- **Deprecated dash-only variable names** — `@-` / `@{-}` style names are
  rejected.
- **Permissive legacy parser corners** — constructs like dynamic `@charset` are
  rejected with a precise diagnostic rather than silently accepted.
- **The `@plugin` hook ABI** — visitor / pre-processor / post-processor /
  file-manager hooks, the full 4.x `less.tree` node API, and the
  `@plugin (options)` + `registerPlugin` lifecycle are **not** implemented.
  Function plugins are supported (above), and the two hooks people most often
  reach for are covered natively: custom import resolution by
  `@jesscss/plugin-node-modules`, and minification by `compress`. For an
  autoprefixer/clean-css style post-process, run PostCSS after Less. (A small
  `addPostProcessor` hook may be revisited if there is real demand.)
- **Byte-identical Less 4 minifier output** — `compress` produces minified CSS,
  but not byte-for-byte the same as Less 4's `-x`; Less 5 preserves authored
  nesting by default.
- **`globalVars` / `modifyVars` injection and `javascriptEnabled`** — not
  supported; these throw rather than silently no-op.

---

*Found something that contradicts this page? Please open an issue — a drift
between this doc and actual behavior is a bug.*
