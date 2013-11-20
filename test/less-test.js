/*jshint latedef: nofunc */

module.exports = function() {
    var path = require('path'),
        fs = require('fs'),
        sys = require('util');

    var less = require('../lib/less');
    var stylize = require('../lib/less/lessc_helper').stylize;

    var globals = Object.keys(global);

    var oneTestOnly = process.argv[2];

    var isVerbose = process.env.npm_config_loglevel === 'verbose';

    var totalTests = 0,
        failedTests = 0,
        passedTests = 0;

    less.tree.functions.add = function (a, b) {
        return new(less.tree.Dimension)(a.value + b.value);
    };
    less.tree.functions.increment = function (a) {
        return new(less.tree.Dimension)(a.value + 1);
    };
    less.tree.functions._color = function (str) {
        if (str.value === "evil red") { return new(less.tree.Color)("600"); }
    };

    function testSourcemap(name, err, compiledLess, doReplacements, sourcemap) {
        fs.readFile(path.join('test/', name) + '.json', 'utf8', function (e, expectedSourcemap) {
            sys.print("- " + name + ": ");
            if (sourcemap === expectedSourcemap) {
                ok('OK');
            } else if (err) {
                fail("ERROR: " + (err && err.message));
                if (isVerbose) {
                    console.error();
                    console.error(err.stack);
                }
            } else {
                difference("FAIL", expectedSourcemap, sourcemap);
            }
        });
    }

    function testErrors(name, err, compiledLess, doReplacements) {
        fs.readFile(path.join('test/less/', name) + '.txt', 'utf8', function (e, expectedErr) {
            sys.print("- " + name + ": ");
            expectedErr = doReplacements(expectedErr, 'test/less/errors/');
            if (!err) {
                if (compiledLess) {
                    fail("No Error", 'red');
                } else {
                    fail("No Error, No Output");
                }
            } else {
                var errMessage = less.formatError(err);
                if (errMessage === expectedErr) {
                    ok('OK');
                } else {
                    difference("FAIL", expectedErr, errMessage);
                }
            }
        });
    }

    function globalReplacements(input, directory) {
        var p = path.join(process.cwd(), directory),
            pathimport = path.join(process.cwd(), directory + "import/"),
            pathesc = p.replace(/[.:/\\]/g, function(a) { return '\\' + (a=='\\' ? '\/' : a); }),
            pathimportesc = pathimport.replace(/[.:/\\]/g, function(a) { return '\\' + (a=='\\' ? '\/' : a); });

        return input.replace(/\{path\}/g, p)
                .replace(/\{pathesc\}/g, pathesc)
                .replace(/\{pathimport\}/g, pathimport)
                .replace(/\{pathimportesc\}/g, pathimportesc)
                .replace(/\r\n/g, '\n');
    }

    function checkGlobalLeaks() {
        return Object.keys(global).filter(function(v) {
            return globals.indexOf(v) < 0;
        });
    }

    function runTestSet(options, foldername, verifyFunction, nameModifier, doReplacements, getFilename) {
        foldername = foldername || "";

        if(!doReplacements) {
            doReplacements = globalReplacements;
        }

        fs.readdirSync(path.join('test/less/', foldername)).forEach(function (file) {
            if (! /\.less/.test(file)) { return; }

            var name = foldername + path.basename(file, '.less');

            if (oneTestOnly && name !== oneTestOnly) {
                return;
            }

            totalTests++;

            if (options.sourceMap) {
                var sourceMapOutput;
                options.writeSourceMap = function(output) {
                    sourceMapOutput = output;
                };
                options.sourceMapOutputFilename = name + ".css";
                options.sourceMapBasepath = path.join(process.cwd(), "test/less");
                options.sourceMapRootpath = "testweb/";
            }

            toCSS(options, path.join('test/less/', foldername + file), function (err, less) {

                if (verifyFunction) {
                    return verifyFunction(name, err, less, doReplacements, sourceMapOutput);
                }
                var css_name = name;
                if(nameModifier) { css_name = nameModifier(name); }
                fs.readFile(path.join('test/css', css_name) + '.css', 'utf8', function (e, css) {
                    sys.print("- " + css_name + ": ");

                    css = css && doReplacements(css, 'test/less/' + foldername);
                    if (less === css) { ok('OK'); }
                    else if (err) {
                        fail("ERROR: " + (err && err.message));
                        if (isVerbose) {
                            console.error();
                            console.error(err.stack);
                        }
                    } else {
                        difference("FAIL", css, less);
                    }
                });
            });
        });
    }

    function diff(left, right) {
        require('diff').diffLines(left, right).forEach(function(item) {
          if(item.added || item.removed) {
            var text = item.value.replace("\n", String.fromCharCode(182) + "\n");
            sys.print(stylize(text, item.added ? 'green' : 'red'));
          } else {
            sys.print(item.value);
          }
        });
        console.log("");
    }

    function fail(msg) {
        console.error(stylize(msg, 'red'));
        failedTests++;
        endTest();
    }

    function difference(msg, left, right) {
        console.warn(stylize(msg, 'yellow'));
        failedTests++;

        diff(left, right);
        endTest();
    }

    function ok(msg) {
        console.log(stylize(msg, 'green'));
        passedTests++;
        endTest();
    }

    function endTest() {
        var leaked = checkGlobalLeaks();
        if (failedTests + passedTests === totalTests) {
            console.log("");
            if (failedTests > 0) {
                console.error(failedTests + stylize(" Failed", "red") + ", " + passedTests + " passed");
            } else {
                console.log(stylize("All Passed ", "green") + passedTests + " run");
            }
            if (leaked.length > 0) {
                console.log("");
                console.warn(stylize("Global leak detected: ", "red") + leaked.join(', '));
            }

            if (leaked.length || failedTests) {
                //process.exit(1);
                process.on('exit', function() { process.reallyExit(1) });
            }
        }
    }

    function toCSS(options, path, callback) {
        var css;
        options = options || {};
        fs.readFile(path, 'utf8', function (e, str) {
            if (e) { return callback(e); }

            options.paths = [require('path').dirname(path)];
            options.filename = require('path').resolve(process.cwd(), path);
            options.optimization = options.optimization || 0;

            new(less.Parser)(options).parse(str, function (err, tree) {
                if (err) {
                    callback(err);
                } else {
                    try {
                        css = tree.toCSS(options);
                        callback(null, css);
                    } catch (e) {
                        callback(e);
                    }
                }
            });
        });
    }

    function testNoOptions() {
        totalTests++;
        try {
            sys.print("- Integration - creating parser without options: ");
            new(less.Parser)();
        } catch(e) {
            fail(stylize("FAIL\n", "red"));
            return;
        }
        ok(stylize("OK\n", "green"));
    }

    return {
        runTestSet: runTestSet,
        testErrors: testErrors,
        testSourcemap: testSourcemap,
        testNoOptions: testNoOptions
    };
};