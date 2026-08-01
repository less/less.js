# Compiler Boundary

`packages/less` does not depend on the batteries-included `jess` package.

The shared render engine lives in `@jesscss/compiler`. The Less package imports
that generic `Compiler`, supplies the Less parser plugin and Less compatibility
plugin through `compile.plugins`, and supplies resolver support with
`@jesscss/plugin-node-modules`.

The boundary is:

- `@jesscss/compiler`: generic config, parse, render, diagnostics, plugin
  lifecycle, and result APIs for any stylesheet language plugin.
- `@jesscss/plugin-less`: Less parser/evaluator defaults and Less-specific
  behavior.
- `@jesscss/plugin-less-compat`: Less compatibility functions and legacy plugin
  bridge behavior.
- `less`: Less public API, `lessc`, option mapping, result/error mapping, and
  the Less-only plugin stack.
- `jess`: batteries-included Jess product package and CLI.

Release checks should prove `less` resolves `@jesscss/compiler` from the
registry package and does not install `jess` as a dependency.
