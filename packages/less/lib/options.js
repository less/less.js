/**
 * Options mapping between Less render options and Jess compiler config.
 * @module less/lib/options
 */

import { lessCompatPlugin } from '@jesscss/plugin-less-compat';

const AT_PLUGIN_RE = /(^|[\r\n])\s*@plugin\b/m;

/**
 * @param {any} value
 * @returns {string}
 */
function stableStringify(value) {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Map Less render options to Jess compiler config.
 * @param {import('./options.js').LessRenderOptions} [options] Less-style options
 * @param {{ source?: string }} [runtime] Render-time inputs used for feature detection
 * @returns {{ configOptions: object, filePath?: string }}
 */
export function createLessOptions(options, runtime = {}) {
  const opts = options || {};
  const filePath = opts.filename || undefined;
  const shouldEnableCompat =
    Array.isArray(opts.plugins) && opts.plugins.length > 0
      ? true
      : typeof runtime.source === 'string' && AT_PLUGIN_RE.test(runtime.source);

  const math = /** @type {number|string|undefined} */ (opts.math);
  const mathMode =
    math === 0 || math === 'always' ? 'always' :
    math === 2 || math === 'parens' || math === 'strict' ? 'parens' :
    'parens-division';

  const configOptions = {
    compile: {
      searchPaths: opts.paths || [],
      mathMode,
      plugins: shouldEnableCompat
        ? [lessCompatPlugin({ plugins: opts.plugins || [] })]
        : [],
    },
    output: {},
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
