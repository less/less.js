/**
 * Less.js v5 — powered by Jess
 *
 * This module provides a Less-compatible API backed by the Jess compiler.
 * It supports the same `less.render()` interface that Less 4.x users expect,
 * while delegating all parsing, evaluation, and output to Jess with the
 * `@jesscss/plugin-less` and `@jesscss/plugin-less-compat` plugins.
 *
 * @module less
 */

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Compiler } from '@jesscss/compiler';
import nodeModulesPlugin from '@jesscss/plugin-node-modules';
import { createLessOptions, getCompilerCacheKey, mapRenderResult } from './options.js';
import { version } from './version.js';
import { logger } from './logger.js';
import { lesscHelper } from './lessc-helper.js';

const compilerCache = new Map();
const lessVersion = version.array;

function normalizeDiagnosticLines(lines, lineNumber, filePath) {
  if (Array.isArray(lines)) {
    return lines.map((line) => typeof line === 'string' ? line : String(line));
  }
  if (lines && typeof lines === 'object') {
    const current = Number(lineNumber) || 1;
    return [current - 1, current, current + 1]
      .filter((line) => line > 0 && Object.prototype.hasOwnProperty.call(lines, line))
      .map((line) => {
        const value = lines[line];
        return typeof value === 'string' ? value : String(value);
      });
  }
  if (typeof filePath === 'string') {
    try {
      const sourceLines = readFileSync(filePath, 'utf8').split(/\r?\n/);
      const current = Number(lineNumber) || 1;
      return [current - 1, current, current + 1]
        .filter((line) => line > 0 && line <= sourceLines.length)
        .map((line) => sourceLines[line - 1]);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function createRenderErrorFromJessDiagnostic(result, filePath) {
  const errors = result?.errors || [];
  const diagnostic = errors[0];
  const error = new Error(diagnostic?.message || 'Less render failed');

  error.type = diagnostic?.phase || 'Syntax';
  error.filename = diagnostic?.filePath || filePath;
  error.line = diagnostic?.line || 1;
  error.column = diagnostic?.column || 1;
  error.extract = normalizeDiagnosticLines(diagnostic?.lines, error.line, error.filename);
  error.jessErrors = errors;
  error.jessWarnings = result?.warnings || [];

  return error;
}

/**
 * @param {object} configOptions
 */
function getCompiler(configOptions) {
  const cacheKey = getCompilerCacheKey(configOptions);
  let compiler = compilerCache.get(cacheKey);
  if (!compiler) {
    compiler = new Compiler(configOptions, {
      defaultPlugins: context => [nodeModulesPlugin({ basePath: context.resolutionBaseDir })],
      scriptPluginSpecifier: '@jesscss/plugin-js',
      scriptPluginResolveFrom: import.meta.url
    });
    compilerCache.set(cacheKey, compiler);
  }
  return compiler;
}

/**
 * Render Less source to CSS.
 *
 * @param {string} input - Less source string
 * @param {import('./options.js').LessRenderOptions} [options={}]
 * @param {Function} [callback] - Optional Node-style callback(err, result)
 * @returns {Promise<import('./options.js').LessRenderResult>}
 */
function render(input, options = {}, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const promise = (async () => {
    const { configOptions, filePath } = createLessOptions(options, { source: input });
    const compiler = getCompiler(configOptions);

    const result = await compiler.renderToResult(
      { source: input, filePath, language: 'less', extension: '.less' },
      { ...configOptions, suppressWarnings: true }
    );

    if (result.errors?.length) {
      throw createRenderErrorFromJessDiagnostic(result, filePath);
    }

    return mapRenderResult(result, options);
  })();

  if (callback) {
    promise.then(
      result => callback(null, result),
      err => callback(err)
    );
  }
  return promise;
}

/**
 * Render a Less file to CSS.
 *
 * @param {string} filePath - Absolute or relative path to .less file
 * @param {import('./options.js').LessRenderOptions} [options={}]
 * @returns {Promise<import('./options.js').LessRenderResult>}
 */
async function renderFile(filePath, options = {}) {
  const source = await readFile(filePath, 'utf8');
  const { configOptions } = createLessOptions(options, { source });
  const compiler = getCompiler(configOptions);

  const result = await compiler.renderToResult(filePath, { ...configOptions, suppressWarnings: true });
  if (result.errors?.length) {
    throw createRenderErrorFromJessDiagnostic(result, filePath);
  }
  return mapRenderResult(result, options);
}

/**
 * COMPAT GAP (v5): the Less 4.x `less.functions` (custom-function registry via
 * `less.functions.functionRegistry.add/addMultiple`) and `less.tree` (node
 * constructors) are intentionally NOT present on the Jess-backed build. Jess
 * registers custom functions with `defineFunction(name, fn, opts)` supplied
 * through the compiler config/plugins, and its values are Jess nodes, not
 * `less.tree.*`. Providing these as throwing stubs would break feature-detection
 * (`if (less.functions)`), so they are left absent until a real compat surface
 * (registry -> defineFunction bridge + tree-node shims) is built. Tracked for
 * the broader Less-runner/API-parity work; see also test/less-test.js guards.
 *
 * @type {import('./types.js').LessStatic}
 */
const less = {
  version: lessVersion,
  render,
  renderFile,
  logger,
  lesscHelper,
  Compiler,
};

export default less;
export { render, renderFile, logger, lesscHelper, Compiler, lessVersion as version };
