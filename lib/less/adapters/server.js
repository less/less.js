var sys = require('sys'),
    events = require('events'),
    fs = require('fs'),
    path = require('path'),
    inspect = require(__dirname + '/../../../../eyes/lib/eyes').inspector({
        styles: {
            string: 'green',
            special: 'cyan',
            key: 'bold'
        }
    });

GLOBAL.inspect = inspect;

require.paths.unshift(path.join(__dirname, '..', '..'));

var less = require('less');

process.mixin(less, require('less/parser'));

['color',    'directive', 'operation',  'dimension',
 'keyword',  'variable',  'ruleset',    'element',
 'selector', 'quoted',    'expression', 'rule', 'call'
].forEach(function (n) {
    process.mixin(less.parser, require('less/node/' + n));
});

var path = "test/test.less";
fs.stat(path, function (e, stats) {
    fs.open(path, process.O_RDONLY, stats.mode, function (e, fd) {
        fs.read(fd, stats.size, 0, "utf8", function (e, data) {
            var tree, css, start, end;

            start = new(Date);
            tree = less.parser.parse(data);
            end = new(Date);

            sys.puts("parsed in " + ((end - start) / 1000) + "s at " + parseInt(1000 / (end - start) * data.length / 1000) + " KB\/s");

            start = new(Date);
            css = tree.toCSS([], {frames: []});
            end = new(Date);

            sys.puts(css.substr(0,4000));
            sys.puts("generated at " + parseInt(1000 / (end - start) * data.length / 1000) + " KB\/s");
        });
    });
});



