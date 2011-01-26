var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    fs = require('fs');

var mess = require('mess');
var tree = require('mess/tree');
var helper = require('./support/helper');

helper.files('rendering', 'mml', function(file) {
    exports['test rendering ' + file] = function(beforeExit) {
        var completed = false;
        var renderResult;

        helper.file(file, function(mml) {
            new mess.Renderer({
                paths: [ path.dirname(file) ],
                data_dir: path.join(__dirname, '../data'),
                local_data_dir: path.join(__dirname, 'rendering'),
                filename: file
            }).render(mml, function (err, output) {
                if (err) {
                    throw err;
                } else {
                    renderResult = output;
                    var result = helper.resultFile(file);
                    helper.compareToXMLFile(result, output, function(err) {
                        completed = true;
                        if (err) {
                            console.warn(
                                helper.stylize("Failure", 'red') + ': '
                                + helper.stylize(file, 'underline')
                                + ' differs from expected result.');
                            helper.showDifferences(err);
                            throw '';
                        }
                    }, [ 
                        helper.removeAbsoluteImages,
                        helper.removeAbsoluteDatasources
                    ]);
                }
            });
        });

        beforeExit(function() {
            if (!completed && renderResult) {
                // console.warn(helper.stylize('renderer produced:', 'bold'));
                // console.warn(renderResult);
            }
            assert.ok(completed, 'Rendering finished.');
        });
    }
});
