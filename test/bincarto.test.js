var assert = require('assert');
var exec = require('child_process').exec;
var path = require('path');
var util = require('util');
var helper = require('./support/helper');
var bin = path.resolve(path.join(__dirname, '..', 'bin', 'carto'));
var fs = require('fs');

describe('bin/carto', function() {
    it('errors on no input', function(done) {
        exec(bin, function(err, stdout, stderr) {
            assert.equal(1, err.code);
            assert.equal("carto: no input files ('carto -h or --help' for help)\n", stdout);
            done();
        });
    });
    it('renders mml', function(done) {
        var file = path.join(__dirname, 'rendering', 'identity.mml');
        exec(util.format('%s %s', bin, file), function(err, stdout, stderr) {
            assert.ifError(err);
            helper.compareToXMLFile(helper.resultFile(file), stdout, done, [
                helper.removeAbsoluteImages,
                helper.removeAbsoluteDatasources
            ]);
        });
    });
    it('renders mss', function(done) {
        var file = path.join(__dirname, 'rendering-mss', 'empty_name.mss');
        exec(util.format('%s %s', bin, file), function(err, stdout, stderr) {
            assert.ifError(err);
            var expected = file.replace(path.extname(file),'')+'.xml';
            var expected_data = fs.readFileSync(expected, 'utf8');
            assert.equal(stdout,expected_data + '\n');
            done();
        });
    });
});
