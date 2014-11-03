var path = require('path'),
    fs = require('./fs'),
    PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    AbstractFileManager = require("../less/environment/abstract-file-manager.js");

var FileManager = function() {
};

FileManager.prototype = new AbstractFileManager();

FileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    return true;
};
FileManager.prototype.supportsSync = function(filename, currentDirectory, options, environment) {
    return true;
};

FileManager.prototype.loadFile = function(filename, currentDirectory, options, environment) {
    return new PromiseConstructor(function(fulfill, reject) {
        var fullFilename,
            data;

        options = options || {};

        var paths = [currentDirectory];
        if (options.paths) paths.push.apply(paths, options.paths);
        if (paths.indexOf('.') === -1) paths.push('.');

        if (options.syncImport) {
            for (var i = 0; i < paths.length; i++) {
                try {
                    fullFilename = path.join(paths[i], filename);
                    fs.statSync(fullFilename);
                    break;
                } catch (e) {
                    fullFilename = null;
                }
            }

            if (!fullFilename) {
                reject({ type: 'File', message: "'" + filename + "' wasn't found" });
                return;
            }

            data = fs.readFileSync(fullFilename, 'utf-8');
            fulfill({ contents: data, filename: fullFilename});
        } else {
            (function tryPathIndex(i) {
                if (i < paths.length) {
                    fullFilename = path.join(paths[i], filename);
                    fs.stat(fullFilename, function (err) {
                        if (err) {
                            tryPathIndex(i + 1);
                        } else {
                            fs.readFile(fullFilename, 'utf-8', function(e, data) {
                                if (e) { reject(e); return; }

                                // do processing in the next tick to allow
                                // file handling to dispose
                                process.nextTick(function() {
                                    fulfill({ contents: data, filename: fullFilename});
                                });
                            });
                        }
                    });
                } else {
                    reject({ type: 'File', message: "'" + filename + "' wasn't found" });
                }
            }(0));
        }
    });
};

FileManager.prototype.loadFileSync = function(filename, currentDirectory, options, environment) {
    filename = path.join(currentDirectory, filename);
    return { contents: fs.readFileSync(filename), filename: filename };
};

module.exports = FileManager;
