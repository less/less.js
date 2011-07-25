var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    fs = require('fs');

var carto = require('../lib/carto');
var tree = require('../lib/carto/tree');
var helper = require('./support/helper');

helper.files('errorhandling', 'mml', function(file) {
    exports['errorhandling ' + path.basename(file)] = function(beforeExit) {
        var completed = false;
        var renderResult;
        var mml = helper.mml(file);
        new carto.Renderer({
            paths: [ path.dirname(file) ],
            data_dir: path.join(__dirname, '../data'),
            local_data_dir: path.join(__dirname, 'rendering'),
            filename: file
        }).render(mml, function (err) {
            var result = helper.resultFile(file);
            var output = err.message;
            // @TODO for some reason, fs.readFile includes an additional \n
            // at the end of read files. Determine why.
            fs.readFile(helper.resultFile(file), 'utf8', function(err, data) {
                assert.deepEqual(output, data.substr(0, data.length - 1));
            });
        });

        beforeExit(function() {
            /*
            if (!completed && renderResult) {
                console.warn(helper.stylize('renderer produced:', 'bold'));
                console.warn(renderResult);
            }
            assert.ok(completed, 'Rendering finished.');
            */
        });
    }
});
