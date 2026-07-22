/**
 * Options mapping between Less render options and Jess compiler config.
 * @module less/lib/options
 */

import lessPlugin from '@jesscss/plugin-less';
import { lessCompatPlugin } from '@jesscss/plugin-less-compat';

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
  const filePath = opts.filename || undefined;
  const lessPlugins = Array.isArray(opts.plugins) ? opts.plugins : [];
  const skipLessCompat =
    opts.__jessSkipLessCompatWhenPluginFree === true && lessPlugins.length === 0;

  const math = /** @type {number|string|undefined} */ (opts.math);
  const mathMode =
    math === 0 || math === 'always' ? 'always' :
    math === 2 || math === 'parens' || math === 'strict' ? 'parens' :
    'parens-division';

  const plugins = [lessPlugin()];
  if (!skipLessCompat) {
    plugins.push(lessCompatPlugin({ plugins: lessPlugins }));
  }

  const configOptions = {
    compile: {
      searchPaths: opts.paths || [],
      mathMode,
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

  if (opts.sourceMap && result.map != null) {
    out.map = typeof result.map === 'string' ? result.map : JSON.stringify(result.map);
  }

  if (result.imports && Array.isArray(result.imports)) {
    out.imports = result.imports;
  }

  return out;
}

export default { createLessOptions, getCompilerCacheKey, mapRenderResult };
