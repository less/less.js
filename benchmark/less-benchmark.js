var path = require('path'),
    fs = require('fs'),
    sys = require('sys');

require.paths.unshift(__dirname, path.join(__dirname, '..'));

var less = require('lib/less');
var file = path.join(__dirname, 'benchmark.less');

if (process.argv[2]) { file = path.join(process.cwd(), process.argv[2]) }

fs.readFile(file, 'utf8', function (e, data) {
    var tree, css, start, end, total;

    sys.puts("Bechmarking...\n", path.basename(file) + " (" +
             parseInt(data.length / 1024) + " KB)", "");

    start = new(Date);

    try {
        var root = new(less.Parser)({ optimization: 2 }).parse(data);
        end = new(Date);

        total = end - start;

        sys.puts("Parsing: " +
                 total + " ms (" +
                 parseInt(1000 / total *
                 data.length / 1024) + " KB\/s)");

        start = new(Date);
        root.toCSS().then(function(css) {
            end = new(Date);

            sys.puts("Generation: " + (end - start) + " ms (" +
                     parseInt(1000 / (end - start) *
                     data.length / 1024) + " KB\/s)");

            total += end - start;

            sys.puts("Total: " + total + "ms (" +
                     parseInt(1000 / total * data.length / 1024) + " KB/s)");
        }, function(e) {
            less.writeError(e);
            process.exit(2);
        });
    } catch (e) {
        less.writeError(e);
        process.exit(1);
    }
});

