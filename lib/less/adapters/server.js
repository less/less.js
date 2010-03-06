var path = require('path');

require.paths.unshift(path.join(__dirname, '..', '..'));

var less = require('less');

process.mixin(less,        require('less/parser'));
process.mixin(less.tree,   require('less/tree'));
process.mixin(exports, less);

require('ext/array');

