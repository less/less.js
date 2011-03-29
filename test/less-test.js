var path = require('path'),
    fs = require('fs'),
    sys = require('sys'),
    assert = require('assert');

var less = require(path.join(__dirname,'..','lib','less'));

less.tree.functions.add = function (a, b) {
    return new(less.tree.Dimension)(a.value + b.value);
}
less.tree.functions.increment = function (a) {
    return new(less.tree.Dimension)(a.value + 1);
}
less.tree.functions.color = function (str) {
    if (str.value === "evil red") { return new(less.tree.Color)("600") }
}

sys.puts("\n" + stylize("LESS", 'underline') + "\n");

fs.readdirSync(path.join(__dirname, 'less')).forEach(function (file) {
    if (! /\.less/.test(file)) { return }

    toCSS(path.join(__dirname, 'less', file), function (err, less) {
        var name = path.basename(file, '.less');

        fs.readFile(path.join(__dirname, 'css', name) + '.css', 'utf-8', function (e, css) {
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

var errors = { 
  'javascript': "JavaScript evaluation error: 'ReferenceError: blah is not defined'"
, 'import-missing': "File 'import/import-test-missing.less' wasn't found"
, 'parse-error': "Missing closing `}`"
}

Object.keys(errors).forEach(function(file) {
  toError(file, errors[file]);
});

less.render('.class { width: 1 + 1 }', function(e, css) {
  sys.print("- render: ");
  try {
    assert.ifError(e);
    assert.equal(css, ".class {\n  width: 2;\n}\n");
    sys.print(stylize('OK', 'green'));
  } catch(e) {
    sys.print(stylize('FAIL: was '+css, 'yellow'));
  }
  sys.puts('');
});

function toCSS(path, callback) {
    var tree, css;
    fs.readFile(path, 'utf-8', function (e, str) {
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

function toError(file, msg) {
    toCSS(path.join(__dirname, 'errors', file+'.less'), function (err, output) {
        var name = path.basename(file, '.less');
        sys.print("- " + 'errors/'+ name + ": ");
        if (!err) {
            sys.print(stylize('FAIL: expected an error: msg', 'yellow'));
        } else if (err.message != msg) {
          sys.print(stylize('FAIL: expected error: '+msg+', was: \n', 'yellow'));
          less.writeError(err);
        } else {
          sys.print(stylize('OK', 'green'));
        }
        sys.puts('');
    });
};

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
