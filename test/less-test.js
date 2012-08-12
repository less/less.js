var path = require('path'),
    fs = require('fs'),
    sys = require('util');

var less = require('../lib/less');

var oneTestOnly = process.argv[2];

less.tree.functions.add = function (a, b) {
    return new(less.tree.Dimension)(a.value + b.value);
}
less.tree.functions.increment = function (a) {
    return new(less.tree.Dimension)(a.value + 1);
}
less.tree.functions._color = function (str) {
    if (str.value === "evil red") { return new(less.tree.Color)("600") }
}

sys.puts("\n" + stylize("LESS", 'underline') + "\n");

fs.readdirSync('test/less').forEach(function (file) {
    if (! /\.less/.test(file)) { return }
    
    var name = path.basename(file, '.less');
    
    if (oneTestOnly && name !== oneTestOnly) { return; }

    toCSS('test/less/' + file, function (err, less) {

        fs.readFile(path.join('test/css', name) + '.css', 'utf-8', function (e, css) {
            sys.print("- " + name + ": ")
            css = css && css.replace(/\r\n/g, '\n');
            if (less === css) { sys.print(stylize('OK', 'green')) }
            else if (err) {
                sys.print(stylize("ERROR: " + (err && err.message), 'red'));
            } else {
                sys.print(stylize("FAIL", 'yellow') + '\n');
                
                require('diff').diffLines(css, less).forEach(function(item) {
                  if(item.added || item.removed) {
                    sys.print(stylize(item.value, item.added ? 'green' : 'red'));
                  } else {
                    sys.print(item.value);
                  }
                })
            }
            sys.puts("");
        });
    });
});

fs.readdirSync('test/less/errors').forEach(function (file) {
    if (! /\.less/.test(file)) { return }
    
    var name = path.basename(file, '.less');
    
    if (oneTestOnly && ("error/" + name) !== oneTestOnly) { return; }

    toCSS('test/less/errors/' + file, function (err, compiledLess) {
        fs.readFile(path.join('test/less/errors', name) + '.txt', 'utf-8', function (e, expectedErr) {
            sys.print("- error/" + name + ": ");
            expectedErr = expectedErr.replace("{path}", path.join(process.cwd(), "/test/less/errors/"))
                .replace(/\r\n/g, '\n');
            if (!err) {
                if (compiledLess) {
                    sys.print(stylize("No Error", 'red'));
                } else {
                    sys.print(stylize("No Error, No Output", 'red'));
                }
                
            } else {
                var errMessage = less.formatError(err);
                if (errMessage === expectedErr) {
                    sys.print(stylize('OK', 'green'));                    
                } else {
                    sys.print(stylize("FAIL", 'yellow') + '\n');
                
                    require('diff').diffLines(expectedErr, errMessage).forEach(function(item) {
                      if(item.added || item.removed) {
                        sys.print(stylize(item.value, item.added ? 'green' : 'red'));
                      } else {
                        sys.print(item.value);
                      }
                    })
                }
            }
            sys.puts("");
        });
    });
});

function toCSS(path, callback) {
    var tree, css;
    fs.readFile(path, 'utf-8', function (e, str) {
        if (e) { return callback(e) }

        new(less.Parser)({
            paths: [require('path').dirname(path)],
            optimization: 0,
            filename: require('path').resolve(process.cwd(), path)
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
        'reset'     : [0,   0],
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
