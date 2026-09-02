/**
 * Browser stub for `module` / `node:module`.
 *
 * `createRequire` is only used on the file/plugin-resolution path (resolving a
 * package.json for versioning, or an `@import`ed node module). None of that runs
 * for a single-file, no-filePath render. Return a require shim whose calls throw
 * clearly if that path is ever reached in the browser.
 */

function unsupported() {
  throw new Error(
    'Less v5 browser preview: module resolution (createRequire) is unsupported (single-file only).'
  );
}

export function createRequire() {
  const req = () => unsupported();
  req.resolve = () => unsupported();
  return req;
}

export default { createRequire };
