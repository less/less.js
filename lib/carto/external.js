var fs = require('fs'),
    get = require('get'),
    url = require('url'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    path = require('path'),
    crypto = require('crypto'),
    assert = require('assert'),
    zip = require('zipfile'),
    Step = require('step');

// node compatibility for mkdirs below
var constants = ((!process.EEXIST) >= 1) ?
    require('constants') :
    { EEXIST: process.EEXIST };


function External(env, uri, alias) {
    var local = !(/^https?:\/\//i.test(uri));
    local && (uri = path.join(env.local_data_dir, uri));
    alias = (env.alias && alias) || crypto.createHash('md5').update(uri).digest('hex');
    alias += path.extname(uri);

    this.uri = uri;
    this.env = env;
    this.alias = alias;
    this.format = path.extname(uri).toLowerCase();
    this.type = External.findType(this.format);
    this.processor = External.processors[this.format];
    this.tmp = local
        ? this.uri
        : path.join(this.env.data_dir, this.alias);

    if (External.instances[this.path()]) {
        return External.instances[this.path()];
    } else {
        External.instances[this.path()] = this;
        External.mkdirp(this.env.data_dir, 0755);
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
            fs.stat(that.tmp, this);
        },
        function(err, t) {
            if (t) return this();
            if (local) throw new Error('File not found.');
            return (new get(that.uri)).toDisk(that.tmp, this);
        },
        function(err) {
            if (err) throw err;
            if (that.processor) return that.processor(that.tmp, that.path(), this);
            this();
        },
        function(err) {
            that.invokeCallbacks(err);
        });
    });
};

External.prototype.path = function() {
    return this.processor
        ? path.join(this.env.data_dir, External.destinations[this.format](this.alias))
        : this.tmp;
};

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
        cb('Relative path: ' + p);
        return;
    }

    var ps = path.normalize(p).split('/');
    path.exists(p, function(exists) {
        if (exists) cb(null);
        else mkdirP(ps.slice(0, -1).join('/'), mode, function(err) {
            if (err && err.errno != process.EEXIST) cb(err);
            else {
                fs.mkdir(p, mode, cb);
            }
        });
    });
};

External.types = [
    {
        extension: /\.zip/,
        datafile: function(d, c) { d.findOneByExtension('.shp', c); },
        ds_options: {
            type: 'shape'
        }
    },
    {
        extension: /\.shp/,
        datafile: function(d, c) { c(null, d.path()); },
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
        datafile: function(d, c) { c(d.path()); },
        ds_options: {
            type: 'ogr',
            layer_by_index: 0
        }
    },
    {
        extension: /.*/g,
        datafile: function(d, c) { c(d.path()); }
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
External.destinations['default'] = function(alias) {
    return alias;
};
External.destinations['.zip'] = function(alias) {
    return path.basename(alias, path.extname(alias));
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
                        callback("Couldn't create directory " + path.dirname(name));
                    }
                    else {
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
        function(err) {
            if (err) throw err;
            if (path.dirname(tempPath) === path.dirname(destPath)) {
                fs.unlink(tempPath, this);
            } else {
                this();
            }
        },
        callback
    );
};

module.exports = External;
