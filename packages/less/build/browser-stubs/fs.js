/**
 * Browser stub for `fs` / `node:fs` / `fs/promises`.
 *
 * The single-file browser build never reads files: the entry calls
 * renderToResult with an inline `source` and no filePath, so config discovery
 * and the entry parse never touch fs. The ONLY way execution reaches here is an
 * `@import` (or a file-reading function like data-uri) in the Less source —
 * which is unsupported in the browser preview. Every method throws a clear
 * message so that surfaces as a normal render error rather than a bundling gap.
 */

function unsupported() {
  throw new Error(
    'Less v5 browser preview: file access / @import is unsupported (single-file only). '
    + 'Use the Node build (`less`) for imports and file-reading functions.'
  );
}

// Named exports used across the jess runtime (readFile, readFileSync, etc.).
// A Proxy returns the same throwing function for any accessed property, so we
// don't have to enumerate the fs surface.
const handler = {
  get() {
    return unsupported;
  }
};

const fs = new Proxy({}, handler);

export default fs;
export const readFile = unsupported;
export const readFileSync = unsupported;
export const existsSync = unsupported;
export const promises = new Proxy({}, handler);
