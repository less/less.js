# Less 5 alpha support boundary

Less 5 alpha.1 is powered by Jess. It is safe to publish only against the
explicit alpha support contract, not against the full Less 4 compatibility
corpus.

The release gate is:

```sh
pnpm run test:alpha
```

That command proves:

- the public ESM/CJS Less package entrypoints load;
- `less.render()` and `less.renderFile()` compile the alpha-supported surface;
- the `lessc` binary belongs to the `less` package and works for stdin, file
  input, sibling imports, output files, and malformed input;
- variables, arithmetic, mixin calls, nested rules, and declaration-order
  preserving collapse work for the alpha-supported path;
- Less plugin configuration loads the Jess Less compatibility plugin when a
  caller supplies plugin options;
- unsupported dynamic `@charset` interpolation rejects with a precise parse
  diagnostic containing filename, line, column, and source extract;
- packed consumer installation resolves the committed published Jess alpha
  dependencies from npm, not workspace links.

The full legacy command remains:

```sh
pnpm run test
```

It is intentionally not the Less 5 alpha.1 release gate. It runs the broad Less
4 fixture and browser-oriented compatibility corpus, which remains the parity
backlog.

Known unsupported alpha.1 buckets:

- Full Less 4 byte-identical fixture parity.
- Less `@plugin`, render-option function plugins, file-manager plugins, and
  pre/post-processors. The compatibility plugin is wired, but plugin execution
  is not alpha.1-supported.
- Source-map options and annotations. Jess source maps need a final output
  chunk/relative-offset design before this can be release-supported.
- Less 4 URL rewrite, `urlArgs`, and `processImports` compatibility.
- Less 4 compressed/minified output identity.
- Permissive legacy syntax edge cases. Removed or deprecated syntax must reject
  with precise diagnostics instead of being accepted accidentally.
- Browser/Sauce harness coverage.

Any unsupported syntax or option that is parsed far enough to diagnose must
produce a user-facing filename, line, column, and source extract. Raw offsets
are not acceptable user diagnostics.
