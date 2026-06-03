// CJS entry: unwrap the Rollup namespace so require('less') returns the Less API object.
const bundle = require('./dist/less-node.cjs');

module.exports = bundle.default || bundle;
Object.assign(module.exports, bundle);
