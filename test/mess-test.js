var path = require('path'),
    fs = require('fs'),
    sys = require('sys');

require.paths.unshift(__dirname, path.join(__dirname, '..'));

var mess = require('lib/mess');

sys.puts("\n" + stylize("MESS", 'underline') + "\n");

fs.readdirSync('mess').forEach(function (file) {
    if (! /\.mss/.test(file)) { return }

    toCSS('mess/' + file, function (err, mess_result) {
        var name = path.basename(file, '.mss');

        fs.readFile(path.join('xml', name) + '.xml',
            'utf-8', function (e, css) {
            if (e) console.log(e);
            sys.print("- " + name + ": ")
            if (mess_result === css) { sys.print(stylize('OK', 'green')) }
            else if (err) {
                sys.print(stylize("ERROR: " + (err && err.message), 'red'));
            } else {
                sys.print(stylize("FAIL", 'yellow'));
                sys.print(mess_result);
            }
            sys.puts("");
        });
    });
});

function toCSS(path, callback) {
    var tree, css;
    fs.readFile(path, 'utf-8', function (e, str) {
        if (e) { return callback(e) }

        new(mess.Parser)({
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
