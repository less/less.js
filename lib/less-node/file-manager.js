var path = require('path'),
    fs = require('./fs'),
    PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    AbstractFileManager = require("../less/environment/abstract-file-manager.js");

var FileManager = function() {
    this.files = {};
};

FileManager.prototype = new AbstractFileManager();

FileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    return true;
};
FileManager.prototype.supportsSync = function(filename, currentDirectory, options, environment) {
    return true;
};

FileManager.prototype.loadFile = function(filename, currentDirectory, options, environment) {
    
    // TODO refactor so isn't cut and paste between loadFileSync
    var fullFilename,
        data,
        isAbsoluteFilename = this.isPathAbsolute(filename),
        filenamesTried = [],
        self = this,
        prefix = filename.slice(0, 1),
        explicit = prefix === "." || prefix === "/";

    options = options || {};

    var paths = isAbsoluteFilename ? [''] : [currentDirectory];

    if (options.paths) { paths.push.apply(paths, options.paths); }

    // Search node_modules
    if (!explicit) { paths.push.apply(paths, this.modulePaths); }
    
    if (!isAbsoluteFilename && paths.indexOf('.') === -1) { paths.push('.'); }

    var prefixes = options.prefixes || [''];
    var fileParts = this.extractUrlParts(filename);

    // promise is guaranteed to be asyncronous
    // which helps as it allows the file handle
    // to be closed before it continues with the next file
    return new PromiseConstructor(function(fulfill, reject) {
        if (options.syncImport) {
            data = this.loadFileSync(filename, currentDirectory, options, environment, 'utf-8');
            if (data.error) {
                reject(data.error);
            }
            else {
                fulfill(data);
            }
            return;
        }
        (function tryPathIndex(i) {
            if (i < paths.length) {
                (function tryPrefix(j) {
                    if (j < prefixes.length) {

                        fullFilename = fileParts.rawPath + prefixes[j] + fileParts.filename;

                        if (paths[i]) {
                            fullFilename = path.join(paths[i], fullFilename);
                        }
                        if (paths[i].indexOf('node_modules') > -1) {
                            try {
                                fullFilename = require.resolve(fullFilename);
                            }
                            catch (e) {}
                        }
                        else {
                            fullFilename = options.ext ? self.tryAppendExtension(fullFilename, options.ext) : fullFilename;
                        }

                        if (self.files[fullFilename]) {
                            fulfill({ contents: self.files[fullFilename], filename: fullFilename});
                        }
                        else {

                            fs.readFile(fullFilename, 'utf-8', function(e, data) {
                                if (e) { 
                                    filenamesTried.push(fullFilename);
                                    return tryPrefix(j + 1);
                                }
                                self.files[fullFilename] = data;
                                fulfill({ contents: data, filename: fullFilename});
                            });
                        }

                    }
                    else {
                        tryPathIndex(i + 1);
                    }
                })(0);
            } else {
                reject({ type: 'File', message: "'" + filename + "' wasn't found. Tried - " + filenamesTried.join(",") });
            }
        }(0));
    });
};

FileManager.prototype.loadFileSync = function(filename, currentDirectory, options, environment, encoding) {
    var fullFilename, paths, filenamesTried = [], isAbsoluteFilename = this.isPathAbsolute(filename) , data;
    options = options || {};

    paths = isAbsoluteFilename ? [""] : [currentDirectory];
    if (options.paths) {
        paths.push.apply(paths, options.paths);
    }
    if (!isAbsoluteFilename && paths.indexOf('.') === -1) {
        paths.push('.');
    }

    var prefixes = options.prefixes || [''];
    var fileParts = this.extractUrlParts(filename);

    var err, result, breakAll = false;
    for (var i = 0; i < paths.length; i++) {
        for (var j = 0; j < prefixes.length; j++) {
            try {
                fullFilename = fileParts.rawPath + prefixes[j] + fileParts.filename;
                if (paths[i]) {
                    fullFilename = path.join(paths[i], fullFilename);
                }
                filenamesTried.push(fullFilename);
                fs.statSync(fullFilename);
                breakAll = true;
                break;
            } catch (e) {
                fullFilename = null;
            }
        }
        if (breakAll) { break; }
    }

    if (!fullFilename) {
        err = { type: 'File', message: "'" + filename + "' wasn't found. Tried - " + filenamesTried.join(",") };
        result = { error: err };
    } else {
        if (this.files[fullFilename]) {
            data = this.files[fullFilename];
        }
        else {
            data = fs.readFileSync(fullFilename, encoding);
            this.files[fullFilename] = data;
        }
        result = { contents: data, filename: fullFilename};
    }

    return result;
};

module.exports = FileManager;
