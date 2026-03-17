/**
 * Entry used by webpack to test browser bundling.
 * Replicates: import less from 'less' in a webpack build targeting browser.
 * See: https://github.com/less/less.js/issues/4423
 */
import less from 'less';

// Minimal sanity check - browser bundle exposes less on window when loaded via script,
// but when bundled we get the module directly
const result = await less.render('.test { color: red; }');
if (!result.css.includes('color: red')) {
    throw new Error('less.render failed');
}
