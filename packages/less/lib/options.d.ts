/**
 * Options mapping between Less render options and Jess compiler config.
 */

export interface LessRenderOptions {
  filename?: string;
  paths?: string[];
  plugins?: unknown[];
  sourceMap?: boolean;
  sourceMapFilename?: string;
  sourceMapRootpath?: string;
  sourceMapBasepath?: string;
  sourceMapURL?: string;
  sourceMapFileInline?: boolean;
  globalVars?: object;
  modifyVars?: object;
  math?: number | 'always' | 'parens-division' | 'parens' | 'strict';
  strictUnits?: boolean;
  rootpath?: string;
  rewriteUrls?: boolean | string;
  urlArgs?: string;
  javascriptEnabled?: boolean;
  compress?: boolean;
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
