var path = require('path');

require.paths.unshift(__dirname);

var less = {
    version: [2, 0, 0],
    parser: require('less/parser').parser,
    tree: require('less/tree')
};

['color',    'directive', 'operation',  'dimension',
 'keyword',  'variable',  'ruleset',    'element',
 'selector', 'quoted',    'expression', 'rule',
 'call',     'url',       'alpha',
 'mixin',    'comment'
].forEach(function (n) {
    require(path.join('less', 'tree', n));
});

require('less/functions');
require('ext/array');

process.mixin(exports, less);

