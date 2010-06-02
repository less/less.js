var path = require('path'),
    fs = require('fs'),
    sys = require('sys');

require.paths.unshift(__dirname, path.join(__dirname, '..'));

var less = require('lib/less');

less.tree.functions.add = function (a, b) {
    return new(less.tree.Dimension)(a.value + b.value);
}
less.tree.functions.increment = function (a) {
    return new(less.tree.Dimension)(a.value + 1);
}
less.tree.functions.color = function (str) {
    if (str.content === "evil red") { return new(less.tree.Color)("600") }
}

sys.puts("\n" + stylize("LESS", 'underline') + "\n");

fs.readdirSync('test/less').forEach(function (file) {
    if (! /\.less/.test(file)) { return }

    toCSS('test/less/' + file, function (err, less) {
        var name = path.basename(file, '.less');

        read(path.join('test/css', name) + '.css', function (e, css) {
            sys.print("- " + name + ": ")
            if (less === css) { sys.print(stylize('OK', 'green')) }
            else if (err) {
                sys.print(stylize("ERROR: " + (err && err.message), 'red'));
            } else {
                sys.print(stylize("FAIL", 'yellow'));
            }
            sys.puts("");
        });
    });
});

function toCSS(path, callback) {
    var tree, css;
    read(path, function (e, str) {
        if (e) { return callback(e) }

        new(less.Parser)({
            paths: [require('path').dirname(path)],
            optimization: 0
        }).parse(str, function (err, tree) {
            if (err) {
                callback(err);
            } else {
                try {
                    css = tree.toCSS();
                    callback(null, css);
                } catch (e) {
                    callback(e);
                }
            }
        });
    });
}

function read(path, callback) {
    fs.stat(path, function (e, stats) {
        if (e) return callback(e);
        fs.open(path, process.O_RDONLY, stats.mode, function (e, fd) {
            if (e) return callback(e);
            fs.read(fd, stats.size, 0, "utf8", function (e, data) {
                if (e) return callback(e);
                callback(null, data);
            });
        });
    });
}

// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'inverse'   : [7,  27],
        'underline' : [4,  24],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}
