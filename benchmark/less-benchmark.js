var path = require('path'),
    fs = require('fs'),
    util = require('util');

var less = require('../lib/index');
var file = path.join(__dirname, 'benchmark.less');

if (process.argv[2]) { file = path.join(process.cwd(), process.argv[2]) }

fs.readFile(file, 'utf8', function (e, data) {
    var tree, css, start, end, total;

    util.puts("Bechmarking...\n", path.basename(file) + " (" +
             parseInt(data.length / 1024) + " KB)", "");

    start = new(Date);

    new(less.Parser)({ optimization: 2 }).parse(data, function (err, tree) {
        end = new(Date);

        total = end - start;

        util.puts("Parsing: " +
                 total + " ms (" +
                 parseInt(1000 / total *
                 data.length / 1024) + " KB\/s)");

        start = new(Date);
        css = tree.toCSS();
        end = new(Date);

        util.puts("Generation: " + (end - start) + " ms (" +
                 parseInt(1000 / (end - start) *
                 data.length / 1024) + " KB\/s)");

        total += end - start;

        util.puts("Total: " + total + "ms (" +
                 parseInt(1000 / total * data.length / 1024) + " KB/s)");

        if (err) {
            less.writeError(err);
            process.exit(3);
        }
    });
});

