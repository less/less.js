var path = require('path'),
    sys = require('sys'),
    fs = require('fs');

require.paths.unshift(path.join(__dirname, '..'));

var bless = {
    version: [1, 0, 4],
    Parser: require('bless/parser').Parser,
    cleanup: require('bless/parser').cleanup
};

for (var k in bless) { exports[k] = bless[k] }