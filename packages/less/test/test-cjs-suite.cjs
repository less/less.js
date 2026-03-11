/**
 * CJS build test — runs a subset of tests using dist/less-node.cjs.
 * Run in addition to the main ESM test suite to verify the CJS build.
 */
'use strict';

const path = require('path');
const fs = require('fs');

console.log('Testing CJS build (dist/less-node.cjs)...\n');

const less = require('../dist/less-node.cjs');
const testFolder = path.dirname(require.resolve('@less/test-data'));

function runTest(name, lessFile, expectedCss) {
  const fullPath = path.join(testFolder, lessFile);
  const content = fs.readFileSync(fullPath, 'utf8');
  return less.render(content, { filename: fullPath })
    .then(function (result) {
      const actual = result.css.trim();
      const expected = (expectedCss || '').trim();
      if (expected && actual !== expected) {
        console.error('FAIL', name, '- output mismatch');
        process.exit(1);
      }
      console.log('  ✓', name);
    })
    .catch(function (err) {
      console.error('FAIL', name, err.message);
      process.exit(1);
    });
}

Promise.all([
  runTest('variables', 'tests-unit/variables/variables.less'),
  runTest('mixins', 'tests-unit/mixins/mixins.less'),
  runTest('operations', 'tests-unit/operations/operations.less'),
  runTest('import', 'tests-unit/import/import.less')
])
  .then(function () {
    console.log('\nCJS build tests passed.');
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
