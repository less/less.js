/**
 * Browser stub for `cosmiconfig`.
 *
 * `styles-config` constructs a cosmiconfig explorer at module top-level, but the
 * search/load methods only run when a filePath is passed to the compiler. The
 * browser build never passes one, so an inert explorer (search/load → null) is
 * sufficient and drops the whole fs/env-paths/import-fresh/resolve-from subtree.
 */

const inertExplorer = {
  search: () => null,
  load: () => null,
  clearCaches: () => {},
  clearLoadCache: () => {},
  clearSearchCache: () => {}
};

export function cosmiconfig() {
  return inertExplorer;
}

export function cosmiconfigSync() {
  return inertExplorer;
}

export const defaultLoaders = {};
export const defaultLoadersSync = {};

export default { cosmiconfig, cosmiconfigSync, defaultLoaders, defaultLoadersSync };
