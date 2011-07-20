var fs = require('fs'),
    get = require('get'),
    url = require('url'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    path = require('path'),
    crypto = require('crypto'),
    assert = require('assert'),
    zip = require('zipfile'),
    _ = require('underscore'),
    Step = require('step');

// node compatibility for mkdirs below
var constants = ((!process.EEXIST) >= 1) ?
    require('constants') :
    { EEXIST: process.EEXIST };


function External(env, uri, alias) {
    env = _(env).clone();
    env.alias = env.alias || false;
    env.tmp_dir = env.tmp_dir || '/tmp/';
    env.data_dir = env.data_dir || '/tmp/';
    env.local_data_dir = env.local_data_dir || '';

    // If local relative path, join with local_data_dir to form an
    // absolute path. Save the original URI if needed for later
    // reference.
    this.originalUri = uri;
    var local = !(/^https?:\/\//i.test(uri));
    if (local && uri[0] !== '/' && env.local_data_dir) {
        uri = path.join(env.local_data_dir, uri);
    }

    this.uri = uri;
    this.format = path.extname(uri).toLowerCase();
    this.type = External.findType(this.format);
    this.processor = External.processors[this.format] || External.processors['default'];
    this.destination = External.destinations[this.format] || External.destinations['default'];

    var hash = crypto.createHash('md5').update(uri).digest('hex');
    // Temporary destination path for staging downloads, pre-processed files.
    if (local) {
        this.tempPath = uri;
    } else {
        this.tempPath = path.join(env.tmp_dir, hash + path.extname(uri));
    }
    // Final external destination path.
    if (local && path.dirname(uri).search(env.data_dir) === 0) {
        this.destPath = uri;
    } else if (env.alias && alias) {
        this.destPath = path.join(env.data_dir, alias, alias + path.extname(uri));
    } else {
        this.destPath = path.join(env.data_dir, hash, hash + path.extname(uri));
    }
    this.destPath = this.destination(this.destPath);

    if (External.instances[this.path()]) {
        return External.instances[this.path()];
    } else {
        External.instances[this.path()] = this;
        External.mkdirp(env.data_dir, 0755);
        this.processFile(local);
    }
}
sys.inherits(External, EventEmitter);

External.instances = {};

External.prototype.invokeCallbacks = function(err) {
    delete External.instances[this.path()];
    if (err) {
        this.emit('err', err);
    } else {
        this.emit('complete', this);
    }
};

External.prototype.processFile = function(local) {
    var that = this;
    fs.stat(that.path(), function(err, p) {
        if (p) return that.invokeCallbacks();

        Step(function() {
            if (local) return this();
            return (new get(that.uri)).toDisk(that.tempPath, this);
        },
        function(err) {
            if (err) throw err;
            return that.processor(that, this);
        },
        function(err) {
            that.invokeCallbacks(err);
        });
    });
};

External.prototype.path = function() { return this.destPath; };

External.prototype.findDataFile = function(callback) {
    this.type.datafile(this, callback);
};

External.prototype.findOneByExtension = function(ext, callback) {
    var cb = function(err, files) { callback(err, files && files.pop()); };
    this.findByExtension(ext, cb);
};

// Find a file by extension in `this.path()`.
// Ignores .directories and .files
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
            }
            files.forEach(function(file) {
                // Ignore dotfiles and dot-directories
                if (file[0] === '.') return;
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
        });
    })(this.path());
};

// https://gist.github.com/707661
External.mkdirp = function mkdirP(p, mode, f) {
    var cb = f || function() {};
    if (p.charAt(0) != '/') {
        cb(new Error('Relative path: ' + p));
        return;
    }

    var ps = path.normalize(p).split('/');
    path.exists(p, function(exists) {
        if (exists) cb(null);
        else mkdirP(ps.slice(0, -1).join('/'), mode, function(err) {
            if (err && err.errno != constants.EEXIST) cb(err);
            else {
                fs.mkdir(p, mode, cb);
            }
        });
    });
};

// Utility function. Implements a `cp -r` like method in node.
External.cpr = function cpr(from, to, callback) {
    fs.stat(from, function(err, stat) {
        if (err) return callback(err);
        if (stat.isFile()) {
            External.mkdirp(path.dirname(to), 0755, function(err) {
                if (err) callback(err);
                fs.readFile(from, function(err, data) {
                    if (err) return callback(err);
                    fs.writeFile(to, data, callback);
                });
            });
        } else if (stat.isDirectory()) {
            External.mkdirp(to, stat.mode, function(err) {
                if (err) return callback(err);
                fs.readdir(from, function(err, files) {
                    if (err) return callback(err);
                    if (!files.length) return callback();
                    var remaining = files.length;
                    for (var i = 0; i < files.length; i++) {
                        cpr(path.join(from, files[i]),
                            path.join(to, files[i]),
                            function(err) {
                                if (err) {
                                    remaining = -1;
                                    return callback(err);
                                } else if (remaining > 0) {
                                    remaining--;
                                    if (!remaining) callback();
                                }
                            }
                        );
                    }
                });
            });
        }
    });
};

External.types = [
    //for datafile: function(d, c) - d is an External object, c is a function taking (err, filename)
    {
        // Assume filepaths without extensions may be directories
        // containing a shapefile.
        extension: /\.zip|^[\s]*$/,
        datafile: function(d, c) { d.findOneByExtension('.shp', c); },
        ds_options: {
            type: 'shape'
        }
    },
    {
        extension: /\.shp/,
        datafile: function(d, c) { d.findOneByExtension('.shp', c); },
        ds_options: {
            type: 'shape'
        }
    },
    {
        extension: /\.png/,
        datafile: function(d, c) { c(null, d.path()); }
    },
    {
        extension: /\.jpe?g/
    },
    {
        extension: /\.geotiff?|\.tiff?/,
        datafile: function(d, c) { c(null, d.path()); },
        ds_options: {
            type: 'gdal'
        }
    },
    {
        extension: /\.vrt/,
        datafile: function(d, c) { c(null, d.path()); },
        ds_options: {
            type: 'gdal'
        }
    },
    {
        extension: /\.kml/,
        datafile: function(d, c) { c(null, d.path()); },
        ds_options: {
            type: 'ogr',
            layer_by_index: 0
        }
    },
    {
        extension: /\.geojson|\.json/,
        datafile: function(d, c) { c(null, d.path()); },
        ds_options: {
            type: 'ogr',
            layer_by_index: 0
        }
    },
    {
        extension: /\.rss/,
        datafile: function(d, c) { c(null, d.path()); },
        ds_options: {
            type: 'ogr',
            layer_by_index: 0
        }
    },
    {
        extension: /.*/g,
        datafile: function(d, c) { c(null, d.path()); }
    }
];

External.findType = function(ext) {
    for (var i in External.types) {
        if (ext.match(External.types[i].extension)) {
            return External.types[i];
        }
    }
};

// Destinations are names in the data_dir/cache directory.
External.destinations = {};
External.destinations['default'] = function(destPath) {
    return destPath;
};
External.destinations['.shp'] = function(destPath) {
    return path.dirname(destPath);
};
External.destinations['.zip'] = function(destPath) {
    return path.dirname(destPath);
};

External.processors = {};
External.processors['default'] = function(ext, callback) {
    External.cpr(ext.tempPath, ext.destPath, callback);
};
External.processors['.shp'] = function(ext, callback) {
    External.cpr(path.dirname(tempPath), path.dirname(destPath), callback);
};
External.processors['.zip'] = function(ext, callback) {
    var tempPath = ext.tempPath;
    var destPath = ext.destPath;
    var originalUri = ext.originalUri;
    try {
        sys.debug('unzipping file');
        var zf = new zip.ZipFile(tempPath);
    } catch (err) {
        callback(err);
        return;
    }

    Step(
        function() {
            var group = this.group();
            zf.names.forEach(function(name) {
                var next = group();
                var uncompressed = path.join(destPath, name);
                External.mkdirp(path.dirname(uncompressed), 0755, function(err) {
                    if (err && err.errno != constants.EEXIST) {
                        callback(new Error("Couldn't create directory " + path.dirname(name)));
                    } else {
                        // if just a directory skip ahead
                        if (!path.extname(name) || name[0] === '.') {
                            next();
                        } else {
                            var buffer = zf.readFile(name, function(err, buffer) {
                                fd = fs.open(uncompressed, 'w', 0755, function(err, fd) {
                                    sys.debug('saving to: ' + uncompressed);
                                    fs.write(fd, buffer, 0, buffer.length, null,
                                        function(err, written) {
                                            fs.close(fd, function(err) {
                                                next();
                                            });
                                        });
                                  });
                            });
                        }
                    }
                });
            });
        },
        // Write an .origin file to indicate the source of this directory.
        function(err) {
            if (err) throw err;
            fs.writeFile(path.join(destPath, '.origin'), originalUri, this);
        },
        callback
    );
};

module.exports = External;
