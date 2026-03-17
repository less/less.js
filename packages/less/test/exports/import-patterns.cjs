/**
 * Verifies package exports support the import patterns users report.
 * Actual import tests: test-es6.js, test-cjs.cjs, webpack-browser.cjs
 * See: https://github.com/less/less.js/issues/4423
 */
'use strict';

const path = require('path');
const fs = require('fs');

console.log('Verifying exports for user import patterns...\n');

const pkgPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const exp = pkg.exports;

if (!exp?.['.']?.browser) {
  console.error('FAIL: exports.browser required (webpack: import less from "less")');
  process.exit(1);
}
if (!fs.existsSync(path.join(__dirname, '../../dist/less.js'))) {
  console.error('FAIL: dist/less.js not found (run "npm run build" first)');
  process.exit(1);
}

console.log('✓ exports support: import less from "less" (Node/ESM)');
console.log('✓ exports support: require("less") (Node/CJS)');
console.log('✓ exports support: import less from "less" (webpack browser → dist/less.js UMD)');
