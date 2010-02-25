var path = require('path'),
    fs = require('fs'),
    sys = require('sys');

require.paths.unshift(__dirname, path.join(__dirname, '..'));

var less = require('lib/less/adapters/server');
var file = path.join(__dirname, 'benchmark.less');

fs.stat(file, function (e, stats) {
    fs.open(file, process.O_RDONLY, stats.mode, function (e, fd) {
        fs.read(fd, stats.size, 0, "utf8", function (e, data) {
            var tree, css, start, end;

            sys.puts("Bechmarking... " + path.basename(file), "");
            start = new(Date);
            tree = less.parser.parse(data);
            end = new(Date);

            sys.puts("Parsed " + parseInt(data.length / 1024) + " KB in " +
                     ((end - start) / 1000) + "s (" +
                     parseInt(1000 / (end - start) *
                     data.length / 1000) + " KB\/s)");

            start = new(Date);
            css = tree.toCSS([], {frames: []});
            end = new(Date);

            sys.puts("Generated " + parseInt(css.length / 1024) + " KB in " +
                     (end - start) + " ms (" +
                     (1000 / (end - start) * css.length / 1000) + " KB\/s)");
        });
    });
});

