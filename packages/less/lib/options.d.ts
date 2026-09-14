/**
 * Options mapping between Less render options and Jess compiler config.
 */

export interface LessRenderOptions {
  filename?: string;
  paths?: string[];
  /**
   * Legacy Less render plugins are routed through the alpha compatibility
   * layer. File-manager, pre/post-processor, and @plugin execution are not
   * alpha.1-supported surfaces yet.
   */
  plugins?: unknown[];
  math?: number | 'always' | 'parens-division' | 'parens' | 'strict';
  /**
   * How to flatten authored nesting. Less v5 preserves authored nesting by
   * default (`false`). `'native'` applies the CSS Nesting desugaring (parent
   * wrapped in `:is()`, child selector lists distributed — specificity-faithful,
   * matching the browser and Less 4.x); `'compact'` additionally folds
   * same-combinator descendant runs into a single `:is()`. `true` is a
   * deprecated alias for `'native'`.
   */
  collapseNesting?: boolean | 'native' | 'compact';
  /** Minified output. */
  compress?: boolean;
  /** Prepend a path to every rewritten `url(...)` and imported reference. */
  rootpath?: string;
  /** Rewrite relative `url(...)` against the importing file: `'all'` | `'local'` | `'off'` (or boolean). */
  rewriteUrls?: boolean | 'all' | 'local' | 'off';
  /** Append a query string to every non-data `url(...)`. */
  urlArgs?: string;
  /**
   * Emit a source map. `true` turns it on with defaults; the object form (or the
   * flat legacy `sourceMap*` options) configures it. Returned as `result.map`.
   */
  sourceMap?: boolean | {
    sourceMapURL?: string;
    sourceMapFilename?: string;
    sourceMapFullFilename?: string;
    sourceMapRootpath?: string;
    sourceMapBasepath?: string;
    sourceMapFileInline?: boolean;
    sourceMapOutputFilename?: string;
    outputSourceFiles?: boolean;
    disableSourcemapAnnotation?: boolean;
  };
  sourceMapURL?: string;
  sourceMapFilename?: string;
  sourceMapFullFilename?: string;
  sourceMapRootpath?: string;
  sourceMapBasepath?: string;
  sourceMapFileInline?: boolean;
  sourceMapOutputFilename?: string;
  outputSourceFiles?: boolean;
  disableSourcemapAnnotation?: boolean;
  /** @internal Jess alpha benchmark-only flag for source graphs already proven @plugin-free. */
  __jessSkipLessCompatWhenPluginFree?: boolean;
}

export interface LessRenderResult {
  css: string;
  map?: string;
  imports?: string[];
}

export interface JessRenderResult {
  css?: string;
  map?: string | object;
  imports?: string[];
}

export function createLessOptions(options?: LessRenderOptions): {
  configOptions: object;
  filePath?: string;
};

export function getCompilerCacheKey(configOptions: object): string;

export function mapRenderResult(
  result: JessRenderResult,
  options?: LessRenderOptions
): LessRenderResult;
