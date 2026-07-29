# Less Alpha Tests

The alpha gate is intentionally split by contract:

- `lessc-alpha.mjs` owns CLI behavior, including Linecraft-formatted stderr.
  Default diagnostics must include color and source framing; `--no-color` must
  suppress terminal control sequences.
- `alpha-support.mjs` owns the supported public API surface and the unsupported
  alpha inventory.
- `alpha-fixtures.mjs` walks the upstream `tests-unit`, `tests-config`,
  `tests-error`, and `tests-warnings` folders. It classifies render parity,
  expected render gaps, forwarded Jess diagnostics, expected missing
  diagnostics, and warning gaps.
- `jess-alpha-fast-path.mjs` and the root publish checks own package assembly,
  optional peer behavior, and packed-consumer proof.
- `test-es6.js` and `test-cjs.cjs` are the alpha Node module smoke tests.
  The historical broad Node harness remains under `test:legacy-node` while
  Less 4 parity-only surfaces such as source maps, remote imports, and legacy
  plugin-host behavior are outside the alpha gate.

Do not grow `alpha-fixtures.mjs` into a second full test framework. Detailed
diagnostic, warning, CLI, and package-contract assertions belong in focused
tests. If those focused tests need cases, filtering, snapshots, hooks, or better
failure reporting, move them to a real test runner instead of expanding the
Node-script harness.
