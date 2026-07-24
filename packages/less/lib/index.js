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

import { readFile } from 'node:fs/promises';
import { Compiler } from 'jess';
import { createLessOptions, getCompilerCacheKey, mapRenderResult } from './options.js';
import { version } from './version.js';
import { logger } from './logger.js';
import { lesscHelper } from './lessc-helper.js';

const compilerCache = new Map();
const lessVersion = version.array;

function getErrorTypeName(type) {
  const normalized = String(type || 'Syntax').toLowerCase();
  if (normalized === 'parse') return 'ParseError';
  if (normalized === 'eval' || normalized === 'evaluate' || normalized === 'resolve') return 'RuntimeError';
  if (normalized === 'syntax') return 'SyntaxError';
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}Error`;
}

function normalizeDiagnosticLines(lines, lineNumber) {
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
  return undefined;
}

function formatRenderError(error) {
  const type = getErrorTypeName(error.type);
  const location = error.filename
    ? ` in ${error.filename} on line ${error.line ?? 1}, column ${error.column ?? 1}`
    : '';
  const extract = Array.isArray(error.extract) && error.extract.length
    ? `:\n${error.extract.map((line) => line ?? '').join('\n')}`
    : '';
  return `${type}: ${error.message}${location}${extract}`;
}

function createRenderErrorFromJessDiagnostic(result, filePath) {
  const diagnostic = result?.errors?.[0];
  const error = new Error(diagnostic?.message || 'Less render failed');

  error.type = diagnostic?.phase || 'Syntax';
  error.filename = diagnostic?.filePath || filePath;
  error.line = diagnostic?.line || 1;
  error.column = diagnostic?.column || 1;
  error.extract = normalizeDiagnosticLines(diagnostic?.lines, error.line);
  error.jessErrors = result?.errors || [];
  error.jessWarnings = result?.warnings || [];
  error.toString = () => formatRenderError(error);

  return error;
}

/**
 * @param {object} configOptions
 */
function getCompiler(configOptions) {
  const cacheKey = getCompilerCacheKey(configOptions);
  let compiler = compilerCache.get(cacheKey);
  if (!compiler) {
    compiler = new Compiler(configOptions);
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
      configOptions
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

  const result = await compiler.renderToResult(filePath, configOptions);
  if (result.errors?.length) {
    throw createRenderErrorFromJessDiagnostic(result, filePath);
  }
  return mapRenderResult(result, options);
}

/** @type {import('./types.js').LessStatic} */
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
