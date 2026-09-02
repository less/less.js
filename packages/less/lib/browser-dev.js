/**
 * Less.js v5 — browser build (powered by Jess).
 *
 * A single-file, in-browser Less→CSS compiler. It drives `@jesscss/compiler`'s
 * `renderToResult` with an inline `source` and NO `filePath`, so the Node-only
 * config-discovery layer (cosmiconfig/env-paths/fs) is never reached. `@import`
 * / file access is unsupported here (see build/browser-stubs/fs.js).
 *
 * Bundled to an IIFE that defines `window.lessV5`.
 *
 * @module less/browser-dev
 */

import { Compiler } from '@jesscss/compiler';
import { createLessOptions, mapRenderResult } from './options.js';

/* Injected at build time from packages/less/package.json. */
/* global __LESS_VERSION__ */
const semver = typeof __LESS_VERSION__ === 'string' ? __LESS_VERSION__ : '5.0.0-alpha.0';
const versionArray = semver.split('.').map((n) => parseInt(n, 10) || 0).slice(0, 3);

/**
 * Build a Less-4.x-shaped error from the first Jess diagnostic. No fs fallback:
 * in the browser there is no file to re-read for the source extract.
 * @param {import('./options.js').JessRenderResult} result
 */
function createRenderError(result) {
  const diagnostic = (result?.errors || [])[0];
  const error = new Error(diagnostic?.message || 'Less render failed');
  error.type = diagnostic?.phase || 'Syntax';
  error.filename = diagnostic?.filePath || 'input';
  error.line = diagnostic?.line || 1;
  error.column = diagnostic?.column || 1;
  const lines = diagnostic?.lines;
  error.extract = Array.isArray(lines) ? lines.map(String) : undefined;
  error.jessErrors = result?.errors || [];
  error.jessWarnings = result?.warnings || [];
  return error;
}

/**
 * Render Less source to a Less-4.x-style result object ({ css, warnings }).
 * @param {string} input Less source
 * @param {object} [options] Less-style options (math, collapseNesting, plugins)
 * @returns {Promise<{ css: string, warnings?: unknown[] }>}
 */
async function render(input, options = {}) {
  const { configOptions } = createLessOptions(options);
  // ponytail: fresh Compiler per call — no defaultPlugins hook, so no
  // node-modules import plugin and no @jesscss/plugin-js. Single-file preview
  // rarely re-renders in a hot loop; a cache map is not worth the surface.
  const compiler = new Compiler(configOptions);
  const result = await compiler.renderToResult(
    { source: input, language: 'less', extension: '.less' },
    { ...configOptions, suppressWarnings: true }
  );
  if (result.errors?.length) {
    throw createRenderError(result);
  }
  return mapRenderResult(result, options);
}

/**
 * Render Less source and resolve to the CSS string only.
 * @param {string} input
 * @param {object} [options]
 * @returns {Promise<string>}
 */
async function renderString(input, options = {}) {
  const { css } = await render(input, options);
  return css;
}

const lessV5 = {
  version: versionArray,
  render,
  renderString,
  Compiler,
};

export default lessV5;
export { render, renderString, Compiler, versionArray as version };
