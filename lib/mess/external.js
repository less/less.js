var fs = require('fs'),
    netlib = require('./netlib'),
    url = require('url'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
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


function External(env, uri) {
    var local = !(/^https?:\/\//i.test(uri))
    if (local) {
        uri = path.join(env.local_data_dir, uri);
    }

    if (External.instances[uri]) return External.instances[uri];

    this.uri = uri;
    this.env = env;
    this.format = path.extname(uri).toLowerCase();
    this._callbacks = [];
    this.done = false;

    External.mkdirp(this.env.data_dir, 0755);

    if (local) {
        this.localFile();
    } else {
        this.downloadFile();
    }

    External.instances[this.uri] = this;
}
sys.inherits(External, EventEmitter);

External.instances = {};

External.prototype.invokeCallbacks = function(err) {
    delete External.instances[this.uri];

    if (err) {
        this.emit('error', err);
    } else {
        this.emit('complete', this);
    }
};


External.prototype.localFile = function() {
    // Only treat files as local that don't have to be processed.
    this.isLocal = !External.processors[this.format];

    this.tempPath = this.uri;
    fs.stat(this.tempPath, this.processFile.bind(this));
};

External.prototype.downloadFile = function() {
    this.tempPath = path.join(
        this.env.data_dir,
        crypto.createHash('md5').update(this.uri).digest('hex') + path.extname(this.uri));

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
            this.invokeCallbacks(null);
        }
    }.bind(this));
};

External.prototype.processFile = function(err) {
    if (err) {
        this.invokeCallbacks(err);
    } else {
        if (this.isLocal) {
            this.invokeCallbacks(null);
        } else {
            (External.processors[this.format] || External.processors['default'])(
                this.tempPath,
                this.path(),
                function(err) {
                    if (err) {
                        this.invokeCallbacks(err);
                    } else {
                        this.invokeCallbacks(null);
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
            (External.destinations[this.format] || External.destinations['default'])(this.uri)
        );
    }
};

External.prototype.findByExtension = function(ext, callback) {
    var running = 0;
    var found = [];

    (function find(dir) {
        running++;
        fs.readdir(dir, function(err, files) {
            if (err) {
                running = 0;
                callback(err);
                return;
                i
            }
            files.forEach(function(file) {
                running++;
                file = path.join(dir, file);
                fs.stat(file, function(err, stats) {
                    if (err) {
                        running = 0;
                        callback(err);
                        return;
                    }
                    if (stats.isDirectory()) {
                        find(file);
                    } else if (stats.isFile() && path.extname(file) === ext) {
                        found.push(file);
                    }
                    if (running && !--running) callback(null, found);
                });
            });
            if (running && !--running) callback(null, found);
        })
    })(this.path());
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
    '.png': 'binary',
    '.jpg': 'binary',
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
    } catch (err) {
        callback(err);
    }

    Step(
        function() {
            var group = this.group();
            // This is blocking, sequential and synchronous.
            zf.names.forEach(function(name) {
                var next = group();
                var uncompressed = path.join(destPath, name);
                External.mkdirp(path.dirname(uncompressed), 0755, function(err) {
                    if (err && err.errno != constants.EEXIST) {
                        callback("Couldn't create directory " + path.dirname(name));
                    }
                    else {
                        if (path.extname(name)) {
                            var buffer = zf.readFileSync(name);
                            sys.debug('saving to: ' + uncompressed);
                            fd = fs.openSync(uncompressed, 'w');
                            fs.writeSync(fd, buffer, 0, buffer.length, null);
                            fs.closeSync(fd);
                            next();
                        }
                        else {
                            throw 'UNIMPLEMENTED';
                        }
                    }
                });
            });
        },
        callback
    );
};

module.exports = External;
