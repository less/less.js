var path = require('path'),
    fs = require('fs'),
    sys = require('sys');

require.paths.unshift(__dirname, path.join(__dirname, '..'));

var less = require('lib/less');
var file = path.join(__dirname, 'benchmark.less');

fs.stat(file, function (e, stats) {
    fs.open(file, process.O_RDONLY, stats.mode, function (e, fd) {
        fs.read(fd, stats.size, 0, "utf8", function (e, data) {
            var tree, css, start, end, total;

            sys.puts("Bechmarking...\n", path.basename(file) + " (" +
                     parseInt(data.length / 1024) + " KB)", "");

            start = new(Date);

            new(less.Parser)({ optimization: 3 }).parse(data, function (err, tree) {
                end = new(Date);

                total = end - start;

                sys.puts("Parsing: " +
                         total + " ms (" +
                         parseInt(1000 / total *
                         data.length / 1024) + " KB\/s)");

                start = new(Date);
                css = tree.toCSS();
                end = new(Date);

                sys.puts("Generation: " + (end - start) + " ms (" +
                         parseInt(1000 / (end - start) *
                         data.length / 1024) + " KB\/s)");

                total += end - start;

                sys.puts("Total: " + total + "ms (" +
                         parseInt(1000 / total * data.length / 1024) + " KB/s)");

                if (err) {
                    less.writeError(err);
                    process.exit(3);
                }
            });
        });
    });
});

