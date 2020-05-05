var path = require('path'),
    fs = require('./fs'),
    PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    AbstractFileManager = require('../less/environment/abstract-file-manager.js');

var FileManager = function() {
    this.contents = {};
};

FileManager.prototype = new AbstractFileManager();

FileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    return true;
};
FileManager.prototype.supportsSync = function(filename, currentDirectory, options, environment) {
    return true;
};

FileManager.prototype.loadFile = function(filename, currentDirectory, options, environment, callback) {
    var fullFilename;
    var isAbsoluteFilename = this.isPathAbsolute(filename);
    var filenamesTried = [];
    var prefix = filename.slice(0, 1);
    var explicit = prefix === '.' || prefix === '/';
    var result = null;
    var isNodeModule = false;
    var npmPrefix = 'npm://';

    options = options || {};

    var paths = isAbsoluteFilename ? [''] : [currentDirectory];

    if (options.paths) { paths.push(...options.paths); }

    if (!isAbsoluteFilename && paths.indexOf('.') === -1) { paths.push('.'); }

    var prefixes = options.prefixes || [''];

    var extensions = this.getPossibleFileExtensions(filename, options.ext);
    var fileParts = this.extractUrlParts(filename);

    if (options.syncImport) {
        getFileData(returnData, returnData);
        if (callback) {
            callback(result.error, result);
        }
        else {
            return result;
        }
    }
    else {
        // promise is guaranteed to be asyncronous
        // which helps as it allows the file handle
        // to be closed before it continues with the next file
        return new Promise(getFileData);
    }

    function returnData(data) {
        if (!data.filename) {
            result = { error: data };
        }
        else {
            result = data;
        }
    }

    function getFileData(fulfill, reject) {
        (function tryPathIndex(i) {
            if (i < paths.length) {
                (function tryPrefix(j) {
                    if (j < prefixes.length) {
                        (function tryExtension(k) {
                            if (k < extensions.length) {
                                isNodeModule = false;
                                fullFilename = fileParts.rawPath + prefixes[j] + fileParts.filename + extensions[k];

                                if (paths[i]) {
                                    fullFilename = path.join(paths[i], fullFilename);
                                }

                                if (!explicit && paths[i] === '.') {
                                    try {
                                        fullFilename = require.resolve(fullFilename);
                                        isNodeModule = true;
                                    }
                                    catch (e) {
                                        filenamesTried.push(npmPrefix + fullFilename);
                                    }
                                }
                                
                                var readFileArgs = [fullFilename];
                                if (!options.rawBuffer) {
                                    readFileArgs.push('utf-8');
                                }
                                if (options.syncImport) {
                                    try {
                                        var data = fs.readFileSync.apply(this, readFileArgs);
                                        fulfill({ contents: data, filename: fullFilename});
                                    }
                                    catch (e) {
                                        filenamesTried.push(isNodeModule ? npmPrefix + fullFilename : fullFilename);
                                        return tryExtension(k + 1);
                                    }
                                }
                                else {
                                    readFileArgs.push(function(e, data) {
                                        if (e) {
                                            filenamesTried.push(isNodeModule ? npmPrefix + fullFilename : fullFilename);
                                            return tryExtension(k + 1);
                                        }    
                                        fulfill({ contents: data, filename: fullFilename});
                                    });
                                    fs.readFile.apply(this, readFileArgs);
                                }
                            }
                            else {
                                tryPrefix(j + 1)
                            }
                        })(0);
                    }
                    else {
                        tryPathIndex(i + 1);
                    }
                })(0);
            } else {
                reject({ type: 'File', message: `'${filename}' wasn't found. Tried - ${filenamesTried.join(',')}` });
            }
        }(0));
    }
};

FileManager.prototype.loadFileSync = function(filename, currentDirectory, options, environment) {
    options.syncImport = true;
    return this.loadFile(filename, currentDirectory, options, environment);
};

module.exports = FileManager;
