var External = require('mess/external');
var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var env = {
    data_dir: path.join(__dirname, 'data'),
    local_data_dir: path.join(__dirname, 'external')
};

// Delete the data directory first to start with a clean slate.
rmrf(env.data_dir);


exports['test External with local file'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 1); });

    new External(env, 'style.mss', function(err, external) {
        if (err) throw err;
        assert.ok(external instanceof External)
        isFile(external.path(), context);
    });
};

exports['test External with local zipfile'] = function(beforeExit) {
    var context = { tests: 0 };
    beforeExit(function() { assert.equal(context.tests, 5); });

    new External(env, 'shapes.zip', function(err, external) {
        if (err) throw err;
        assert.ok(external instanceof External)
        isDirectory(external.path(), context);
        isFile(path.join(external.path(), 'world_borders.dbf'), context);
        isFile(path.join(external.path(), 'world_borders.prj'), context);
        isFile(path.join(external.path(), 'world_borders.shp'), context);
        isFile(path.join(external.path(), 'world_borders.shx'), context);
    });
}

function isDirectory(dir, context) {
    fs.stat(dir, function(err, stats) {
        if (err) throw err;
        assert.ok(stats.isDirectory());
        context.tests++;
    });
}

function isFile(file, context) {
    fs.stat(file, function(err, stats) {
        if (err) throw err;
        assert.ok(stats.isFile());
        context.tests++;
    });
}

function rmrf(p) {
    try {
        if (fs.statSync(p).isDirectory()) {
            fs.readdirSync(p).forEach(function(file) { rmrf(path.join(p, file)); });
            fs.rmdirSync(p);
        }
        else fs.unlinkSync(p);
    } catch(err) {
        if (err.errno !== process.ENOENT) throw err;
    }
}