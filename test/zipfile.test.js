var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    External = require('mess/external');

exports['test_unzip_remote'] = function(beforeExit) {
    var tests = 0;
    var remote = 'http://cascadenik-sampledata.s3.amazonaws.com/world_borders.zip';
    var env = {
        data_dir: path.join(__dirname, 'zipfile')
    };
    new External(env, remote).on('complete', function(err, result) {
        if (err) throw err;
        assert.ok(result instanceof External);

        fs.stat(result.path(), function(err, stats) {
            if (err) throw err;
            assert.ok(stats.isDirectory());
            tests++;
        });
        isFile(path.join(result.path(), 'world_borders.dbf'));
        isFile(path.join(result.path(), 'world_borders.prj'));
        isFile(path.join(result.path(), 'world_borders.shp'));
        isFile(path.join(result.path(), 'world_borders.shx'));

        function isFile(file) {
            fs.stat(file, function(err, stats) {
                if (err) throw err;
                assert.ok(stats.isFile());
                tests++;
            });
        }
      }
    );
    beforeExit(function() {
        assert.equal(tests, 5, 'Not all tests were executed.');
    });
};


