var path = require('path'),
    fs = require('fs'),
    sys = require('sys'),
    assert = require('assert');

require.paths.unshift(
    path.join(__dirname, '../lib/node'),
    path.join(__dirname, '../lib')
);

var mess = require('mess');
var tree = require('mess/tree');
var xml2js = require('xml2js');


var messDir = path.join(__dirname, 'mess');
var resultDir = path.join(__dirname, 'xml');

fs.readdirSync(messDir).forEach(function (file) {
    if (! /\.mss$/.test(file)) return;

    toCSS(path.join(messDir, file), function (err_compile, mess_result) {
        var name = path.basename(file, '.mss');

        if (err_compile) {
            // Compilation failed. This may be intentional. In this case, we
            // have a JSON file that contains the excpected error description.
            fs.readFile(path.join(resultDir, name + '.json'), 'utf-8', function (err_result, json_result) {
                if (err_result) {
                    // This is a test failure; the test should compile properly
                    // but does not.
                    console.log(stylize("FAIL", 'red') + ': compilation failed for ' + stylize(file, 'underline') + '.');
                    showErrors(err_compile);
                } else {
                    // For this test, compilation should fail. We now check whether
                    // we got the expected errors.
                    try {
                        json_result = JSON.parse(json_result);
                    } catch (e) {
                        console.log(stylize("FAIL", 'red') + ': JSON result file ' + stylize(name + '.json', 'underline') + ' is invalid.');
                        return;
                    }

                    try {
                        assert.deepEqual(json_result, err_compile);
                    } catch (e) {
                        console.log(stylize("FAIL", 'red') + ': Errors in ' + stylize(name + '.json', 'underline') + ' differ from actual errors.');
                        console.log('    ' + stylize('actual', 'bold') + ' ' + sys.inspect(e.actual).replace(/\n/g, '\n           '));
                        console.log('  ' + stylize('expected', 'bold') + ' ' + sys.inspect(e.expected).replace(/\n/g, '\n           '));
                        console.log('');
                        return;
                    }

                    console.log(stylize("SUCCESS", 'green') + ': ' + stylize(file, 'underline') + ' passed test.');
                }
            });
        }
        else {
            // Compilation succeeded
            fs.readFile(path.join(resultDir, name + '.xml'), 'utf-8', function (err_result, xml_result) {
                if (err_result) {
                    // The xml file is not present. This means that compilation
                    // should not have succeeded.
                    console.log(stylize("FAIL", 'red') + ': compilation succeeded for ' + stylize(file, 'underline') + ', but there is no result XML.');
                } else {
                    // Parse the XML file.
                    var resultParser = new xml2js.Parser();
                    resultParser.addListener('end', function(resultXML) {
                        var messParser = new xml2js.Parser();
                        messParser.addListener('end', function(messXML) {
                            try {
                                assert.deepEqual(resultXML, messXML);
                            } catch (e) {
                                console.log(stylize("FAIL", 'red') + ': XML output for ' + stylize(file, 'underline') + ' differs expected XML.');
                                console.log('    ' + stylize('actual', 'bold') + ' ' + sys.inspect(e.actual, false, null).replace(/\n/g, '\n           '));
                                console.log('  ' + stylize('expected', 'bold') + ' ' + sys.inspect(e.expected, false, null).replace(/\n/g, '\n           '));
                                console.log('');
                                return;
                            }

                            console.log(stylize("SUCCESS", 'green') + ': ' + stylize(file, 'underline') + ' passed test.');
                        });
                        messParser.parseString('<Map>' + mess_result + '</Map>');
                    });
                    resultParser.parseString('<Map>' + xml_result + '</Map>');
                }
            });
        }
    });
});

function toCSS(filename, callback) {
    var tree, css;
    fs.readFile(filename, 'utf-8', function (e, str) {
        if (e) { return callback(e) }

        var parser = new mess.Parser({
            paths: [ path.dirname(filename) ],
            optimization: 0,
            returnErrors: true
        });

        try {
            parser.parse(str, function (err, tree) {
                if (err) {
                    callback(err);
                } else {
                    try {
                        css = tree.toCSS();

                        // Parse errors aren't thrown because we set returnErrors.
                        // But if it's an array, this indicates an error.
                        if (Array.isArray(css)) {
                            callback(css);
                        }
                        else {
                            callback(null, css);
                        }
                    } catch (e) {
                        callback(e);
                    }
                }
            });
        } catch (e) {
            callback([ e ]);
        }
    });
}

function showErrors(errors) {
    for (var i = 0; i < errors.length; i++) {
        mess.writeError(errors[i], { indent: '      ' });
    }
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
