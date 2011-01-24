var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    fs = require('fs');

var mess = require('mess');
var tree = require('mess/tree');
var helper = require('./support/helper');

helper.files('rendering', 'mml', function(file) {
    exports['test rendering ' + file] = function(beforeExit) {
        var success = false;

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
                    var result = helper.resultFile(file);
                    helper.file(result, function(result) {
                        assert.equal(output, result);
                        success = true;
                    });
                }
            });
        });

        beforeExit(function() {
            assert.ok(success, 'Rendering finished.');
        });
    }
});
