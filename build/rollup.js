const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const terser = require('rollup-plugin-terser').terser;

async function buildBrowser() {
  let bundle;
  const outputOptions = {

  };
  try {
    bundle = await rollup.rollup({
      input: './lib/less-browser/bootstrap.js',
      plugins: [
        resolve(),
        commonjs(),
        babel({
          presets: [["@babel/env", {
            targets: '> 0.25%, not dead'
          }]],
          exclude: 'node_modules/**' // only transpile our source code
        })
      ]
    });
  }
  catch (e) {
    console.log(e);
    return;
  }

  const cache = bundle.cache;

  await bundle.write({
    file: './dist/less.js',
    format: 'umd',
    name: 'less'
  });

  bundle = await rollup.rollup({
    cache,
    plugins: [
      terser()
    ]
  });

  await bundle.write({
    file: './dist/less.min.js',
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
        resolve({
          only: [/^\.{0,2}\//],
        }),
        commonjs(),
        babel({
          presets: [["@babel/env", {
            targets: {
              node: '6'
            }
          }]],
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
  await buildBrowser();
  // await buildNode();
}

build();