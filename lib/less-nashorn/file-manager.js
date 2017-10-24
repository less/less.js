var Paths = Java.type('java.nio.file.Paths'),
    Files = Java.type('java.nio.file.Files'),
    PromiseConstructor,
    AbstractFileManager = require("../less/environment/abstract-file-manager.js");

try {
    PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;
} catch(e) {
}

var FileManager = function() {
};

FileManager.prototype = new AbstractFileManager();

FileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    return true;
};
FileManager.prototype.supportsSync = function(filename, currentDirectory, options, environment) {
    return true;
};

FileManager.prototype.loadFile = function(filename, currentDirectory, options, environment, callback) {
    var data;

    options = options || {};

    data = this.loadFileSync(filename, currentDirectory, options, environment, 'utf-8');
    callback(data.error, data);
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

    var err, result;
    for (var i = 0; i < paths.length; i++) {
        try {
            fullFilename = filename;
            if (paths[i]) {
                fullFilename = Paths.get(paths[i], fullFilename).normalize().toString();
            }
            filenamesTried.push(fullFilename);
            if (Files.isRegularFile(Paths.get(fullFilename)) === false)
                throw "File does not exist";
            break;
        } catch (e) {
            fullFilename = null;
        }
    }

    if (!fullFilename) {
        err = { type: 'File', message: "'" + filename + "' wasn't found. Tried - " + filenamesTried.join(",") };
        result = { error: err };
    } else {
        try {
            if (!encoding) {
                // data-uri.js doesn't pass useBase64 or the encoding type so look it up again
                var mimetype = environment.mimeLookup(fullFilename);
                // use base 64 unless it's an ASCII or UTF-8 format
                encoding = environment.charsetLookup(mimetype);
            }
            if (encoding) {
                data = new java.lang.String(Files.readAllBytes(Paths.get(fullFilename)), encoding);
            }
            else
                data = Files.readAllBytes(Paths.get(fullFilename));
            result = {contents: data, filename: fullFilename};
        }
        catch (e) {
            err = { type: 'File', message: "'" + fullFilename + "' failed reading - " + e.message};
            result = { error: err };
        }
    }

    return result;
};

module.exports = FileManager;
