var External = require('mess/external');
var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    helper = require('./support/helper');

var env = {
    data_dir: path.join(__dirname, 'data'),
    local_data_dir: path.join(__dirname, 'external')
};

// Delete the data directory first to start with a clean slate.
helper.rmrf(env.data_dir);


exports['test External with local file'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 1); });

    new External(env, 'style.mss', function(err, external) {
        if (err) throw err;
        assert.ok(external instanceof External)
        helper.isFile(external.path(), context);
    });
};

exports['test External with local zipfile'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 5); });

    new External(env, 'shapes.zip', function(err, external) {
        if (err) throw err;
        assert.ok(external instanceof External)
        helper.isDirectory(external.path(), context);
        helper.isFile(path.join(external.path(), 'world_borders.dbf'), context);
        helper.isFile(path.join(external.path(), 'world_borders.prj'), context);
        helper.isFile(path.join(external.path(), 'world_borders.shp'), context);
        helper.isFile(path.join(external.path(), 'world_borders.shx'), context);
    });
}

exports['test External with remote zipfile'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 5); });

    new External(env, 'http://cascadenik-sampledata.s3.amazonaws.com/world_borders.zip', function(err, external) {
        if (err) throw err;
        assert.ok(external instanceof External)
        helper.isDirectory(external.path(), context);
        helper.isFile(path.join(external.path(), 'world_borders.dbf'), context);
        helper.isFile(path.join(external.path(), 'world_borders.prj'), context);
        helper.isFile(path.join(external.path(), 'world_borders.shp'), context);
        helper.isFile(path.join(external.path(), 'world_borders.shx'), context);
    });
}
