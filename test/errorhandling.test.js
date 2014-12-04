var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var carto = require('../lib/carto');
var tree = require('../lib/carto/tree');
var helper = require('./support/helper');

describe('Error handling mml+mss', function() {
helper.files('errorhandling', 'mml', function(file) {
    var basename = path.basename(file);
    it('should handle errors in ' + basename, function(done) {
        var completed = false;
        var renderResult;
        var mml = helper.mml(file);
        try {
            new carto.Renderer({
                paths: [ path.dirname(file) ],
                data_dir: path.join(__dirname, '../data'),
                local_data_dir: path.join(__dirname, 'rendering'),
                filename: file
            }).render(mml);
            // should not get here
            assert.ok(false);
            done();
        } catch(err) {
            if (err.message.indexOf('***') > -1) throw err;
            var result = helper.resultFile(file);
            var output = err.message;
            // @TODO for some reason, fs.readFile includes an additional \n
            // at the end of read files. Determine why.
            // fs.writeFileSync(helper.resultFile(file), output);
            var data = fs.readFileSync(helper.resultFile(file), 'utf8');
            assert.deepEqual(output, data);
            done();
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
            }).renderMSS(mss);
            // should not get here
            assert.ok(false);
            done();
        } catch(err) {
            if (err.message.indexOf('***') > -1) throw err;
            var result = helper.resultFile(file);
            var output = err.message;
            // @TODO for some reason, fs.readFile includes an additional \n
            // at the end of read files. Determine why.
            // fs.writeFileSync(helper.resultFile(file), output);
            var data = fs.readFileSync(helper.resultFile(file), 'utf8');
            assert.deepEqual(output, data);
            done();
        }
    });
});
});
