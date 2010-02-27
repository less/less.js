var path = require('path');

require.paths.unshift(path.join(__dirname, '..', '..'));

var less = require('less');

process.mixin(less, require('less/parser'));
process.mixin(less.parser, require(path.join('less', 'node')));

['color',    'directive', 'operation',  'dimension',
 'keyword',  'variable',  'ruleset',    'element',
 'selector', 'quoted',    'expression', 'rule',
 'call',     'url',       'alpha'
].forEach(function (n) {
    process.mixin(less.parser, require(path.join('less', 'node', n)));
});

process.mixin(exports, less);

