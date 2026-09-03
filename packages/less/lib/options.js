/**
 * Options mapping between Less render options and Jess compiler config.
 * @module less/lib/options
 */

import lessPlugin from '@jesscss/plugin-less';
import { lessCompatPlugin } from '@jesscss/plugin-less-compat';
import { logger } from './logger.js';

const unsupportedAlphaOptions = new Map([
  ['sourceMap', 'source maps are not supported'],
  ['sourceMapFilename', 'source maps are not supported'],
  ['sourceMapRootpath', 'source maps are not supported'],
  ['sourceMapBasepath', 'source maps are not supported'],
  ['sourceMapURL', 'source maps are not supported'],
  ['sourceMapFileInline', 'source maps are not supported'],
  ['globalVars', 'global variable injection is not supported'],
  ['modifyVars', 'modify-var injection is not supported'],
  ['rootpath', 'URL rootpath rewriting is not supported'],
  ['rewriteUrls', 'URL rewriting is not supported'],
  ['urlArgs', 'URL argument rewriting is not supported'],
  ['javascriptEnabled', 'JavaScript evaluation is not supported'],
  ['compress', 'compressed output is not supported'],
]);

function validateAlphaOptions(options) {
  for (const [name, reason] of unsupportedAlphaOptions) {
    // A falsy value is the 4.x default ("off") and requests nothing, so it is
    // a no-op here; only an actual request for the feature is unsupported.
    if (options[name]) {
      throw new Error(`${name} is not supported: ${reason}`);
    }
  }
}

/**
 * @param {any} value
 * @param {WeakSet<object>} [seen]
 * @returns {string}
 */
function stableStringify(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') {
    if (typeof value === 'function') {
      return JSON.stringify(`[function ${value.name || 'anonymous'}]`);
    }
    return JSON.stringify(value);
  }
  if (seen.has(value)) {
    return '"[Circular]"';
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item, seen)).join(',')}]`;
  }
  if (value.name && typeof value.name === 'string' && ('install' in value || 'parser' in value || 'opts' in value)) {
    return stableStringify({
      plugin: value.name,
      opts: value.opts || {},
    }, seen);
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`);
  return `{${entries.join(',')}}`;
}

/**
 * Map Less render options to Jess compiler config.
 * @param {import('./options.js').LessRenderOptions} [options] Less-style options
 * @returns {{ configOptions: object, filePath?: string }}
 */
export function createLessOptions(options) {
  const opts = options || {};
  validateAlphaOptions(opts);
  const filePath = opts.filename || undefined;
  const lessPlugins = Array.isArray(opts.plugins) ? opts.plugins : [];
  const skipLessCompat =
    opts.__jessSkipLessCompatWhenPluginFree === true && lessPlugins.length === 0;

  const math = /** @type {number|string|undefined} */ (opts.math);
  const mathMode =
    math === 0 || math === 'always' ? 'always' :
    math === 2 || math === 'parens' || math === 'strict' ? 'parens' :
    'parens-division';

  // `unitMode` is the option ('loose' | 'preserve' | 'strict'); `strictUnits`
  // is its deprecated boolean alias: true → 'strict'; false means "not strict",
  // i.e. the default ('preserve') — never the Less 4.x 'loose' fold, which only
  // an explicit `unitMode: 'loose'` selects. Any use warns so the mapping is
  // never discovered by staring at output. Left unset so the compiler default applies.
  const unitMode = opts.unitMode !== undefined ? opts.unitMode
    : opts.strictUnits === true ? 'strict'
    : undefined;
  if (opts.strictUnits !== undefined && opts.unitMode === undefined) {
    logger.warn(
      `strictUnits is deprecated; use unitMode. strictUnits: ${String(opts.strictUnits)} now means `
      + `unitMode: '${unitMode ?? 'preserve'}'${opts.strictUnits ? '' : " (Less 4.x unit folding is unitMode: 'loose')"}`
    );
  }

  const plugins = [lessPlugin()];
  if (!skipLessCompat) {
    plugins.push(lessCompatPlugin({ plugins: lessPlugins }));
  }

  const configOptions = {
    compile: {
      searchPaths: opts.paths || [],
      mathMode,
      ...(unitMode !== undefined && { unitMode }),
      plugins,
    },
    // Less v5 preserves authored nesting unless its explicit compatibility
    // switch requests flattened CSS. Keep that public Less option at the
    // wrapper boundary; Jess owns the one renderer and its output mode.
    // A file's styles.config may use an output array. A file-less output entry
    // is the compiler's documented per-render override for that shape, so an
    // explicit public Less option remains authoritative over fixture config.
    output: Object.prototype.hasOwnProperty.call(opts, 'collapseNesting')
      ? [{ collapseNesting: opts.collapseNesting === true }]
      : {},
    language: {},
  };

  return { configOptions, filePath };
}

/**
 * Stable compiler cache key for a Jess compiler configured from Less options.
 * @param {object} configOptions Jess compiler config
 * @returns {string}
 */
export function getCompilerCacheKey(configOptions) {
  return stableStringify(configOptions);
}

/**
 * Map Jess render result to Less-style result.
 * @param {import('./options.js').JessRenderResult} result Jess compiler result
 * @param {import('./options.js').LessRenderOptions} [options] Original Less options
 * @returns {import('./options.js').LessRenderResult}
 */
export function mapRenderResult(result, options) {
  const opts = options || {};
  /** @type {import('./options.js').LessRenderResult} */
  const out = {
    css: result.css ?? '',
  };

  if (result.imports && Array.isArray(result.imports)) {
    out.imports = result.imports;
  }

  // Structured Jess warnings (e.g. selector/parentless-ampersand). Exposed so
  // callers and tests can assert them, mirroring how errors surface.
  if (result.warnings && Array.isArray(result.warnings)) {
    out.warnings = result.warnings;
  }

  return out;
}

export default { createLessOptions, getCompilerCacheKey, mapRenderResult };
