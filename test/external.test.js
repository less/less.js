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

    new External(env, 'style.mss')
        .on('complete', function(external) {
            assert.ok(external instanceof External)
            helper.md5File(external.path(), '7e659de8be9aacf42c356774a60adf00', context);
        });
};

exports['test External with remote file'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 1); });

    new External(env, 'http://tilemill-data.s3.amazonaws.com/test_data/ipsum.json')
        .on('complete', function(external) {
            assert.ok(external instanceof External)
            helper.md5File(external.path(), '651ea0ff31786e9be9012112b21573be', context);
        });
};

exports['test External with local zipfile'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 5); });

    new External(env, 'shapes.zip').on('complete',
        function(external) {
            assert.ok(external instanceof External)
            helper.isDirectory(external.path(), context);
            helper.md5File(path.join(external.path(), 'world_borders.dbf'), '5dd220a6470ac525a5dbd8fce728c8c6', context);
            helper.md5File(path.join(external.path(), 'world_borders.prj'), '15541cb58c5710db8f6ded679d93f20e', context);
            helper.md5File(path.join(external.path(), 'world_borders.shp'), '0ce4134dd36385cc359890af9d527c02', context);
            helper.md5File(path.join(external.path(), 'world_borders.shx'), '3cac59ecc9ddf2a1053de46a7f9e9168', context);
        });
}

exports['test External with remote zipfile'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 5); });

    new External(env, 'http://tilemill-data.s3.amazonaws.com/test_data/shape_demo.zip')
        .on('complete', function(external) {
            assert.ok(external instanceof External)
            helper.isDirectory(external.path(), context);
            helper.md5File(path.join(external.path(), 'world_borders.dbf'), '575521efe28ff68ecd5e7606e326fd2b', context);
            helper.md5File(path.join(external.path(), 'world_borders.prj'), 'be918e3fd426824bae21eba8a79b1257', context);
            helper.md5File(path.join(external.path(), 'world_borders.shp'), '30d9b1709ba596f092abea49f4f9401b', context);
            helper.md5File(path.join(external.path(), 'world_borders.shx'), '535cb8568177f7ab95ab823cd6c16eb8', context);
        });
}
