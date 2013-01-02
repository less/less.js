var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var existsSync = require('fs').existsSync || require('path').existsSync;
var carto = require('../lib/carto');
var tree = require('../lib/carto/tree');
var helper = require('./support/helper');



describe('Rendering mss', function() {
helper.files('rendering-mss', 'mss', function(file) {
    it('should render mss ' + path.basename(file) + ' correctly', function(done) {
        var completed = false;
        var renderResult;
        var mss = helper.mss(file);
        new carto.Renderer({
            paths: [ path.dirname(file) ],
            data_dir: path.join(__dirname, '../data'),
            local_data_dir: path.join(__dirname, 'rendering'),
            filename: file
        }).renderMSS(mss, function (err, output) {
            if (err) {
                if (Array.isArray(err)){
                    err.forEach(carto.writeError);
                    done();
                } else {
                    throw err;
                    done();
                }
            } else {
                var expected =  file.replace(path.extname(file),'')+'.xml';
                if (!existsSync(expected)) {
                  fs.writeFileSync(expected,output);
                }
                var expected_data = fs.readFileSync(expected).toString();
                assert.equal(output,expected_data);
                done();
            }
        });
    });
});
});

