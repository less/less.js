var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var carto = require('../lib/carto');
var tree = require('../lib/carto/tree');
var helper = require('./support/helper');

describe('Error handling mml+mss', function() {
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
                    done();
                } else {
                    var result = helper.resultFile(file);
                    var output = err.message;
                    // @TODO for some reason, fs.readFile includes an additional \n
                    // at the end of read files. Determine why.
                    fs.readFile(helper.resultFile(file), 'utf8', function(err, data) {
                        if (!err) assert.deepEqual(output, data.substr(0, data.length - 1));
                        done();
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
                done();
            });
        }
    });
});
});

describe('Error handling mss', function() {
helper.files('errorhandling', 'mss', function(file) {
    var basename = path.basename(file);
    if (basename == 'multi_stylesheets_a.mss') {
        return;
    }
    it('should handle errors in ' + basename, function(done) {
        var completed = false;
        var renderResult;
        var mss = helper.mss(file);
        try {
            new carto.Renderer({
                paths: [ path.dirname(file) ],
                data_dir: path.join(__dirname, '../data'),
                local_data_dir: path.join(__dirname, 'rendering'),
                // note: we use the basename here so that the expected error result
                // will match if the style was loaded from mml
                filename: basename
            }).renderMSS(mss, function (err) {
                if (!err) {
                    console.warn("*** <--- WARNING invalid error handling test found (" + file + "): all error handling tests should throw errors!");
                    done();
               } else {
                    var result = helper.resultFile(file);
                    var output = err.message;
                    // @TODO for some reason, fs.readFile includes an additional \n
                    // at the end of read files. Determine why.
                    fs.readFile(helper.resultFile(file), 'utf8', function(err, data) {
                        if (!err) assert.deepEqual(output, data.substr(0, data.length - 1));
                        done();
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
                done();
            });
        }
    });
});
});
