const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

async function buildBrowser() {
  let bundle;
  try {
    bundle = await rollup.rollup({
      input: './lib/less-browser/bootstrap.js',
      plugins: [
        resolve(),
        commonjs(),
        babel({
          exclude: 'node_modules/**' // only transpile our source code
        })
      ]
    });
  }
  catch (e) {
    console.log(e);
    return;
  }

  await bundle.write({
    file: './dist/less.js',
    format: 'umd',
    name: 'less',
    sourcemap: true
  });
}

async function buildNode() {
  let bundle;
  try {
    bundle = await rollup.rollup({
      input: './lib/less-node/index.js',
      plugins: [
        resolve(),
        commonjs(),
        babel({
          exclude: 'node_modules/**' // only transpile our source code
        })
      ]
    });
  }
  catch (e) {
    console.log(e);
    return;
  }

  await bundle.write({
    file: './dist/less.cjs.js',
    format: 'cjs'
  });
}

async function build() {
  // await buildBrowser();
  await buildNode();
}

build();