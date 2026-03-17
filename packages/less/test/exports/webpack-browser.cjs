/**
 * Tests that webpack can bundle less for browser target without
 * "Can't resolve 'module'" error.
 * See: https://github.com/less/less.js/issues/4423
 */
'use strict';

const path = require('path');
const fs = require('fs');

async function run() {
  let webpack;
  try {
    webpack = require('webpack');
  } catch (e) {
    console.log('Skipping webpack browser test: webpack not installed');
    console.log('  (Add webpack and webpack-cli as devDependencies to run this test)');
    return;
  }

  const config = {
    mode: 'development',
    target: 'web',
    entry: path.join(__dirname, 'webpack-browser-entry.js'),
    output: {
      path: path.join(__dirname, '..', '..', 'tmp'),
      filename: 'webpack-browser-test-bundle.js'
    },
    resolve: {
      conditionNames: ['browser', 'import', 'require', 'default']
    },
    module: {
      rules: [
        {
          // dist/less.js is UMD - ensure webpack treats it correctly
          test: /[\\/]dist[\\/]less\.js$/,
          type: 'javascript/auto'
        }
      ]
    }
  };

  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      const info = stats.toJson();
      if (stats.hasErrors()) {
        const msg = info.errors.map(e => (e.message || String(e))).join('\n');
        reject(new Error('Webpack build failed:\n' + msg));
        return;
      }
      const outPath = path.join(config.output.path, config.output.filename);
      if (!fs.existsSync(outPath)) {
        reject(new Error('Bundle was not created'));
        return;
      }
      console.log("✓ Testing: import less from 'less' in webpack build (browser target) — #4423");
      resolve();
    });
  });
}

run().catch((err) => {
  console.error('Webpack browser test FAILED:', err.message);
  process.exit(1);
});
