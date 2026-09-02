/**
 * Build the single-file, browser-loadable Less v5 (jess) bundle.
 *
 * Produces `dist/less-browser-dev.js`: an IIFE exposing `window.less` with the
 * Less 4.x browser API — `less.render(input, options?, callback?)`.
 *
 * Runtime parseman (the pure-JS table interpreter) IS bundled — it does the
 * parsing. Node file/config built-ins are aliased to browser stubs because a
 * single-file, no-filePath render never touches them (see build/browser-stubs).
 */

import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const stubs = join(here, 'browser-stubs');

const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));

// path-browserify is a real, browser-safe `path`. `url` is aliased to a small
// inert stub (its helpers only fire on the file-resolution path we never hit).
const pathBrowserify = 'path-browserify';

const result = await esbuild.build({
  entryPoints: [join(pkgRoot, 'lib/browser-dev.js')],
  bundle: true,
  format: 'iife',
  globalName: 'less',
  platform: 'browser',
  target: ['es2020'],
  outfile: join(pkgRoot, 'dist/less-browser-dev.js'),
  minify: process.argv.includes('--minify'),
  sourcemap: process.argv.includes('--sourcemap'),
  legalComments: 'none',
  metafile: true,
  define: {
    __LESS_VERSION__: JSON.stringify(pkg.version),
    // A minimal process shim; the jess runtime reads process.env.* and cwd().
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.JESS_PROFILE': 'undefined',
    'process.env.JESS_DEBUG': 'undefined'
  },
  // Collapse `window.less` to the IIFE's default export (the render API).
  footer: {
    js: 'if (typeof window !== "undefined" && window.less && window.less.default) { window.less = window.less.default; }'
  },
  // Leading /*! …*/ marks this as the EXPERIMENTAL dev build. banner is emitted
  // verbatim (not subject to minify/legalComments), so the notice always leads
  // the file. Then process.cwd() and a couple of globals the jess runtime
  // touches. Kept tiny.
  banner: {
    js:
      '/*! Less v5 (alpha) browser build. For live styling in the browser, follow the Less browser guide. Compiling Less in the browser is not intended for production — compile ahead of time (Node "less") for production builds. */\n' +
      'var process = (typeof globalThis !== "undefined" && globalThis.process) || { env: {}, cwd: function () { return "/"; }, argv: [], platform: "browser" };'
  },
  alias: {
    fs: join(stubs, 'fs.js'),
    'node:fs': join(stubs, 'fs.js'),
    'fs/promises': join(stubs, 'fs.js'),
    'node:fs/promises': join(stubs, 'fs.js'),
    module: join(stubs, 'module.js'),
    'node:module': join(stubs, 'module.js'),
    url: join(stubs, 'url.js'),
    'node:url': join(stubs, 'url.js'),
    path: pathBrowserify,
    'node:path': pathBrowserify,
    cosmiconfig: join(stubs, 'cosmiconfig.js')
  }
});

const outBytes = result.metafile.outputs['dist/less-browser-dev.js']?.bytes
  ?? readFileSync(join(pkgRoot, 'dist/less-browser-dev.js')).length;
console.log(`built dist/less-browser-dev.js — ${(outBytes / 1024 / 1024).toFixed(2)} MB (${outBytes} bytes)`);
