/**
 * Options mapping between Less render options and Jess compiler config.
 * @module less/lib/options
 */

import lessPlugin from '@jesscss/plugin-less';
import { lessCompatPlugin } from '@jesscss/plugin-less-compat';
import { logger } from './logger.js';

const unsupportedAlphaOptions = new Map([
  ['globalVars', 'global variable injection is not supported'],
  ['modifyVars', 'modify-var injection is not supported'],
  ['javascriptEnabled', 'JavaScript evaluation is not supported'],
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
 * `collapseNesting` accepts `false` (keep authored nesting — the v5 default),
 * `'native'` (CSS Nesting desugaring: parent wrapped in `:is()`, child selector
 * lists distributed, specificity-faithful), `'compact'` (like `'native'` but
 * also folds same-combinator descendant runs into one `:is()`), or the
 * deprecated boolean `true` (alias for `'native'`). Anything else is rejected.
 * @param {unknown} value
 * @returns {boolean|'native'|'compact'}
 */
function resolveCollapseNesting(value) {
  if (value === false || value === true || value === 'native' || value === 'compact') {
    return value;
  }
  throw new Error(
    `collapseNesting must be false, 'native', 'compact', or true `
    + `(deprecated alias for 'native'); got ${JSON.stringify(value)}`
  );
}

/**
 * Build the compiler's `output.sourceMap` value from Less options. Source maps
 * are enabled when `sourceMap` is truthy; the object form (or the flat legacy
 * `sourceMap*` options) configures the details. Returns `undefined` when no
 * source map is requested.
 * @param {import('./options.js').LessRenderOptions} opts
 * @returns {undefined | true | Record<string, unknown>}
 */
function resolveSourceMap(opts) {
  if (!opts.sourceMap) {
    return undefined;
  }
  const config = (typeof opts.sourceMap === 'object' && opts.sourceMap !== null)
    ? { ...opts.sourceMap }
    : {};
  // Fold the flat legacy `sourceMap*` options into the object form the compiler
  // reads; an explicit object sub-option wins over its flat alias.
  const flat = [
    'sourceMapURL', 'sourceMapFilename', 'sourceMapFullFilename',
    'sourceMapRootpath', 'sourceMapBasepath', 'sourceMapFileInline',
    'sourceMapOutputFilename', 'outputSourceFiles', 'disableSourcemapAnnotation'
  ];
  for (const key of flat) {
    if (opts[key] !== undefined && config[key] === undefined) {
      config[key] = opts[key];
    }
  }
  return Object.keys(config).length > 0 ? config : true;
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

  // URL rewriting lives on the Less plugin (it rewrites `url(...)` during
  // serialization), not in `output`. Only forward keys the caller set so the
  // plugin's own v5 defaults apply otherwise.
  const lessPluginOptions = {};
  if (opts.rootpath !== undefined) lessPluginOptions.rootpath = opts.rootpath;
  if (opts.rewriteUrls !== undefined) lessPluginOptions.rewriteUrls = opts.rewriteUrls;
  if (opts.urlArgs !== undefined) lessPluginOptions.urlArgs = opts.urlArgs;

  const plugins = [lessPlugin(lessPluginOptions)];
  if (!skipLessCompat) {
    plugins.push(lessCompatPlugin({ plugins: lessPlugins }));
  }

  // The projection/serialization options the compiler reads off `output`:
  // `collapseNesting` (nesting flatten mode), `compress` (minified output), and
  // `sourceMap`. Emitted as a single file-less array entry so an explicit render
  // option overrides a file-local styles.config for every key (the config merge
  // appends it as the override default); left `{}` when the caller set none.
  const outputEntry = {};
  if (opts.collapseNesting !== undefined) {
    outputEntry.collapseNesting = resolveCollapseNesting(opts.collapseNesting);
  }
  if (opts.compress !== undefined) {
    outputEntry.compress = opts.compress;
  }
  const sourceMap = resolveSourceMap(opts);
  if (sourceMap !== undefined) {
    outputEntry.sourceMap = sourceMap;
  }
  const output = Object.keys(outputEntry).length > 0 ? [outputEntry] : {};

  const configOptions = {
    compile: {
      searchPaths: opts.paths || [],
      mathMode,
      ...(unitMode !== undefined && { unitMode }),
      plugins,
    },
    output,
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

  // Less 4.x returns the source map as `result.map` (a JSON string) when one was
  // requested; forward it so `less.render(src, { sourceMap: true })` behaves the
  // same. The compiler writes the `sourceMappingURL` annotation into `css` itself.
  if (result.map !== undefined) {
    out.map = result.map;
  }

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
