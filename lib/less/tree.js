var path = require('path');
var tree = exports;

require.paths.unshift(__dirname);

['color',    'directive', 'operation',  'dimension',
 'keyword',  'variable',  'ruleset',    'element',
 'selector', 'quoted',    'expression', 'rule',
 'call',     'url',       'alpha',
 'mixin',    'comment'
].forEach(function (n) {
    process.mixin(tree, require(path.join('less', 'tree', n)));
});

require('functions');

tree.operate = function (op, a, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
    }
};

