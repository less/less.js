var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var carto = require('../lib/carto');
var tree = require('../lib/carto/tree');
var helper = require('./support/helper');

describe('Error handling', function() {
helper.files('errorhandling', 'mml', function(file) {
    it('should handle errors in ' + path.basename(file), function(done) {
        var completed = false;
        var renderResult;
        var mml = helper.mml(file);
        try {
            new carto.Renderer({
                paths: [ path.dirname(file) ],
                data_dir: path.join(__dirname, '../data'),
                local_data_dir: path.join(__dirname, 'rendering'),
                filename: file
            }).render(mml, function (err) {
                if (!err) {
                    console.warn("*** <--- WARNING invalid error handling test found (" + file + "): all error handling tests should throw errors!");
                } else {
                    var result = helper.resultFile(file);
                    var output = err.message;
                    // @TODO for some reason, fs.readFile includes an additional \n
                    // at the end of read files. Determine why.
                    fs.readFile(helper.resultFile(file), 'utf8', function(err, data) {
                        if (!err) assert.deepEqual(output, data.substr(0, data.length - 1));
                    });
                }
            });
        } catch(err) {
            var result = helper.resultFile(file);
            var output = err.message;
            // @TODO for some reason, fs.readFile includes an additional \n
            // at the end of read files. Determine why.
            fs.readFile(helper.resultFile(file), 'utf8', function(err, data) {
                if (!err) assert.deepEqual(output, data.substr(0, data.length - 1));
            });
        }

        done();
    });
});
});
