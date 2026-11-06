/**
 * Loads the built `dist/less-browser-dev.js` in a context with browser globals
 * and no Node `process`, then renders through `window.less`. Run `build:browser`
 * first.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const bundle = readFileSync(new URL('../dist/less-browser-dev.js', import.meta.url), 'utf8');

const window = {
    location: { href: 'http://localhost/' },
    document: {},
    console,
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    TextDecoder,
    queueMicrotask,
    performance
};
window.window = window;
window.globalThis = window;
window.self = window;

vm.runInContext(bundle, vm.createContext(window));

const { css } = await window.less.render('.m() { x: 1; }\n.a { b: (1 + 1); .m(); &:hover { c: contrast(#f00); } }\n');
assert.equal(css, '.a {\n  b: 2;\n  x: 1;\n  &:hover {\n    c: #000000;\n  }\n}\n');
console.log('Less browser bundle render passed');
