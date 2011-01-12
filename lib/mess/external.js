var fs = require('fs'),
    netlib = require('./netlib'),
    url = require('url'),
    path = require('path'),
    _ = require('underscore')._,
    spawn = require('child_process').spawn;

/**
 * TODO: use node-minizip instead of shelling
 * TODO: include or don't use underscore
 */

var External = function External(env) {
    var env = env;

    return {
        env: env,

        /**
         * Download an external, process it, and return the usable filepath for
         * Mapnik
         * @param {String} resource_url the URI of the datasource from a mapfile.
         * @param {Function} callback passed into processor function after
         *     localizing.
         */
        process: function(resource_url, callback) {
            var file_format = path.extname(resource_url).toLowerCase(),
                that = this;

            try {
                if (fs.statSync(this.tmppos(resource_url)).isFile()) {
                    callback(null, [
                        resource_url,
                        this.destinations(file_format)(resource_url, that)
                        ]);
                    return;
                }
            } catch (e) {
                console.log(e);
            }

            netlib.download(resource_url, this.tmppos(resource_url),
                function(err, url, filename) {
                if (that.processors(file_format)) {
                    that.processors(file_format)(
                        filename,
                        resource_url,
                        callback,
                        that);
                } else {
                    console.log('no processor found for %s', file_format);
                }
            });
        },

        /**
         * Get a processor, given a file's extension
         * @param {String} extension the file's extension.
         * @return {Function} processor function.
         */
        processors: function(extension) {
            return {
                '.zip': this.unzip,
                '.mss': this.plainfile,
                '.geojson': this.plainfile,
                '.kml': this.plainfile
            }[extension];
        },

        destinations: function(extension) {
            return {
                '.zip': this.unzip_dest,
                '.mss': this.plainfile_dest,
                '.geojson': this.plainfile_dest,
                '.kml': this.plainfile_dest
            }[extension];
        },

        /**
         * Get the final resting position of an external's directory
         * @param {String} ext name of the external.
         * @return {String} file path.
         */
        pos: function(ext) {
            return path.join(this.env.data_dir, netlib.safe64(ext));
        },

        /**
         * Get the temporary path of an external before processing
         * @param {String} ext filename of the external.
         * @return {String} file path.
         */
        tmppos: function(ext) {
            return path.join(this.env.data_dir, require('crypto')
                .createHash('md5').update(ext).digest('hex'));
        },

        plainname: function(resource_url) {
            return require('crypto')
                .createHash('md5').update(resource_url).digest('hex') +
                path.extname(resource_url);

        },

        unzip_dest: function(resource_url, that) {
            return that.locateShp(that.pos(resource_url));
        },

        plainfile_dest: function(resource_url, that) {
            return path.join(that.pos(resource_url),
                that.plainname(resource_url));
        },

        /**
         * Deal with a plain file, which is likely to be
         * GeoJSON, KML, or one of the other OGR-supported formats,
         * returning a Mapnik-usable filename
         *
         * @param {String} filename the place of the file on your system.
         * @param {String} resource_url
         * @param {Function} callback
         */
        plainfile: function(filename, resource_url, callback, that) {
            // TODO: possibly decide upon default extension
            var extension = path.extname(resource_url);
            if (extension !== '') {
                // TODO: make sure dir doesn't exist
                var destination = path.join(that.pos(resource_url),
                    that.plainname(resource_url));
                fs.mkdirSync(that.pos(resource_url), 0777);
                fs.renameSync(
                    filename,
                    destination);
                callback(null, [resource_url, destination]);
            } else {
                throw Exception('Non-extended files cannot be processed');
            }
        },

        locateShp: function(dir) {
            try {
                var unzipped = fs.readdirSync(dir);
                var shp = _.detect(unzipped,
                    function(f) {
                        return path.extname(f) == '.shp';
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
                            var located = locateShp(path.join(dir, dirs[i]));
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
        },

        /**
         * Unzip a file and return a shapefile contained within it
         *
         * TODO: handle other files than shapefiles
         * @param {String} filename the place of the shapefile on your system.
         * @param {String} resource_url
         * @param {Function} callback
         */
        unzip: function(filename, resource_url, callback, that) {
            // regrettably complex because zip library isn't written for
            // node yet.
            spawn('unzip', [filename, '-d', that.pos(resource_url)])
                .on('exit', function(code) {
                if (code > 0) {
                    console.log('Unzip returned a code of %d', code);
                } else {
                    // TODO; eliminate locality of reference
                    callback(null, [
                        resource_url,
                        that.locateShp(that.pos(resource_url))]);
                }
            });
        }
    };
};

module.exports = External;
