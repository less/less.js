/**
 * Browser stub for `node:url`'s pathToFileURL/fileURLToPath.
 *
 * Only reached on the file-resolution path (never for a no-filePath render).
 * Provide inert-but-shaped helpers so any stray call degrades gracefully rather
 * than crashing the bundle load.
 */

export function pathToFileURL(p) {
  return { href: 'file://' + String(p) };
}

export function fileURLToPath(u) {
  return String(u).replace(/^file:\/\//, '');
}

export default { pathToFileURL, fileURLToPath };
