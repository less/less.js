/**
 * JSDoc type definitions for Less.js v5 (Jess wrapper).
 * @module less/lib/types
 */

/**
 * @typedef {import('./options.js').LessRenderResult} LessRenderResult
 */

/**
 * @typedef {Object} LessStatic
 * @property {number[]} version Less-compatible version tuple
 * @property {function(string, import('./options.js').LessRenderOptions?, function?): Promise<LessRenderResult>} render Render Less to CSS
 * @property {function(string, import('./options.js').LessRenderOptions?): Promise<LessRenderResult>} renderFile Render Less file to CSS
 * @property {import('./logger.js').default} logger Logger instance
 * @property {import('./lessc-helper.js').default} lesscHelper CLI helper
 * @property {object} Compiler Jess Compiler class
 */

export {};
