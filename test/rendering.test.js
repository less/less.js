var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var carto = require('../lib/carto');
var tree = require('../lib/carto/tree');
var helper = require('./support/helper');

describe('Rendering', function() {
helper.files('rendering', 'mml', function(file) {
    it('should render ' + path.basename(file) + ' correctly', function(done) {
        var completed = false;
        var renderResult;
        var mml = helper.mml(file);
        new carto.Renderer({
            paths: [ path.dirname(file) ],
            data_dir: path.join(__dirname, '../data'),
            local_data_dir: path.join(__dirname, 'rendering'),
            filename: file
        }).render(mml, function (err, output) {
            if (err) {
                if (Array.isArray(err)){
                    err.forEach(carto.writeError);
                } else {
                    throw err;
                }
            } else {
                var result = helper.resultFile(file);
                renderResult = output;
                helper.compareToXMLFile(result, output, function(err,expected_json,actual_json) {
                    completed = true;
                    var actual = file.replace(path.extname(file),'') + '-actual.json';
                    var expected = file.replace(path.extname(file),'') + '-expected.json';
                    if (err) {
                        // disabled since it can break on large diffs
                        /*
                        console.warn(
                            helper.stylize("Failure", 'red') + ': ' +
                            helper.stylize(file, 'underline') +
                            ' differs from expected result.');
                        helper.showDifferences(err);
                        throw '';
                        */
                        fs.writeFileSync(actual,JSON.stringify(actual_json,null,4));
                        fs.writeFileSync(expected,JSON.stringify(expected_json,null,4));
                        throw new Error('failed: ' + actual + ' not equal to expected: ' + result);
                    } else {
                        // cleanup any actual renders that no longer fail
                        try {
                          fs.unlinkSync(actual);
                          fs.unlinkSync(expected);
                        } catch (err) {}
                    }
                    done();
                }, [
                    helper.removeAbsoluteImages,
                    helper.removeAbsoluteDatasources
                ]);
            }
        });

        // beforeExit(function() {
        //     if (!completed && renderResult) {
        //         console.warn(helper.stylize('renderer produced:', 'bold'));
        //         console.warn(renderResult);
        //     }
        //     assert.ok(completed, 'Rendering finished.');
        // });
    });
});
});
