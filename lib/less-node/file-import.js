var path = require('path'),
    fs = require('./fs'),
    PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    AbstractFileManager = require("../less/environment/abstract-file-manager.js");

var FileImport = function() {
};

FileImport.prototype = new AbstractFileManager();

FileImport.prototype.supports = function(filename, currentDirectory, options, environment) {
    return true;
};
FileImport.prototype.supportsSync = function(filename, currentDirectory, options, environment) {
    return true;
};

FileImport.prototype.loadFile = function(filename, currentDirectory, options, environment) {
    return new PromiseConstructor(function(fullfill, reject) {
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
            fullfill({ contents: data, filename: fullFilename});
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
                                    fullfill({ contents: data, filename: fullFilename});
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

FileImport.prototype.loadFileSync = function(filename, currentDirectory, options, environment) {
    filename = path.join(currentDirectory, filename);
    return { contents: fs.readFileSync(filename), filename: filename };
};

module.exports = new FileImport();
