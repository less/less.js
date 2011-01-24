var fs = require('fs'),
    netlib = require('./netlib'),
    url = require('url'),
    path = require('path'),
    crypto = require('crypto'),
    assert = require('assert'),
    zip = require('zipfile'),
    Step = require('step');

// node compatibility for mkdirs below
var constants = {};
if (!process.EEXIST >= 1)
    constants = require('constants');
else
    constants.EEXIST = process.EEXIST;


function External(env, uri, callback) {
    // assert.ok(data_dir in env);
    // assert.ok(local_data_dir in env);

    this.env = env;
    this.callback = callback;
    this.uri = uri;
    this.format = path.extname(uri).toLowerCase();

    External.mkdirp(path.join(this.env.data_dir, 'cache'), 0755);
    External.mkdirp(path.join(this.env.data_dir, 'temp'), 0755);

    if (/^https?:\/\//i.test(uri)) {
        this.downloadFile();
    } else {
        this.localFile();
    }
}

External.prototype.localFile = function() {
    // Only treat files as local that don't have to be processed.
    this.isLocal = !External.processors[this.format];

    this.tempPath = path.join(this.env.local_data_dir, this.uri);
    fs.stat(this.tempPath, this.processFile.bind(this));
};

External.prototype.downloadFile = function() {
    this.tempPath = path.join(
        this.env.data_dir, 'temp',
        crypto.createHash('md5').update(this.uri).digest('hex') + path.extname(this.uri));

        console.log('downloading to ', this.tempPath);

    fs.stat(this.path(), function(err, stats) {
        if (err) {
            // This file does not yet exist. Download it!
            netlib.download(
                this.uri,
                this.tempPath,
                External.encodings[this.format] || External.encodings['default'],
                this.processFile.bind(this)
            );
        } else {
            this.callback(null, this);
        }
    }.bind(this));
};

External.prototype.processFile = function(err) {
    if (err) {
        this.callback(err);
    } else {
        if (this.isLocal) {
            this.callback(null, this);
        } else {
            (External.processors[this.format] || External.processors['default'])(
                this.tempPath,
                this.path(),
                function(err) {
                    if (err) {
                        this.callback(err);
                    } else {
                        this.callback(null, this);
                    }
                }.bind(this)
            );
        }
    }
};


External.prototype.path = function() {
    if (this.isLocal) {
        return this.tempPath;
    }
    else {
        return path.join(
            this.env.data_dir,
            'cache',
            (External.destinations[this.format] || External.destinations['default'])(this.uri)
        );
    }
};

External.prototype.shapeFile = function shapeFile() {
    try {
        var dir = this.path();
        var unzipped = fs.readdirSync(dir);
        var shp = _.detect(unzipped,
            function(f) {
                return path.extname(f).toLowerCase() == '.shp';
            }
        );
        if (!shp) {
            var dirs = _.select(unzipped,
                function(f) {
                    return fs.statSync(path.join(dir, f)).isDirectory();
                }
            );
            if (dirs) {
                for (var i = 0, l = dirs.length; i < l; i++) {
                    var located = shapeFile.call(this, path.join(dir, dirs[i]));
                    if (located) {
                        return located;
                    }
                }
            }
        } else {
            return path.join(dir, shp);
        }
    } catch (e) {
        return false;
    }
};

// https://gist.github.com/707661
External.mkdirp = function mkdirP (p, mode, f) {
    var cb = f || function () {};
    if (p.charAt(0) != '/') { cb('Relative path: ' + p); return }

    var ps = path.normalize(p).split('/');
    path.exists(p, function (exists) {
        if (exists) cb(null);
        else mkdirP(ps.slice(0,-1).join('/'), mode, function (err) {
            if (err && err.errno != process.EEXIST) cb(err)
            else {
                fs.mkdir(p, mode, cb);
            }
        });
    });
};



External.encodings = {
    '.zip': 'binary',
    '.shp': 'binary',
    'default': 'utf-8'
};

// Destinations are names in the data_dir/cache directory.
External.destinations = {};
External.destinations['default'] = function(uri) {
    return crypto.createHash('md5').update(uri).digest('hex') + path.extname(uri);
};
External.destinations['.zip'] = function(uri) {
    return crypto.createHash('md5').update(uri).digest('hex');
};


External.processors = {};
External.processors['default'] = function(tempPath, destPath, callback) {
    if (tempPath === destPath) {
        callback(null);
    } else {
        fs.rename(tempPath, destPath, callback);
    }
};
External.processors['.zip'] = function(tempPath, destPath, callback) {
    try {
        var zf = new zip.ZipFile(tempPath);
        // This is blocking, sequential and synchronous.
        zf.names.forEach(function(name) {
            var uncompressed = path.join(destPath, name);
            External.mkdirp(path.dirname(uncompressed), 0755, function(err) {
                if (err && err.errno != constants.EEXIST) {
                    throw "Couldn't create directory " + path.dirname(name);
                }
                else {
                    if (path.extname(name)) {
                        var buffer = zf.readFileSync(name);
                        console.log('saving to: ' + uncompressed);
                        fd = fs.openSync(uncompressed, 'w');
                        fs.writeSync(fd, buffer, 0, buffer.length, null);
                        fs.closeSync(fd);
                    }
                    else {
                        throw 'UNIMPLEMENTED';
                    }
                }
            });
        });
        callback(null);
    } catch (err) {
        console.log(err);
        callback(err);
    }
};



module.exports = External;
