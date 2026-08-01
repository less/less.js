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
   * Opt into Less 4-style flattened output. Less v5 preserves authored nesting
   * by default.
   */
  collapseNesting?: boolean;
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
