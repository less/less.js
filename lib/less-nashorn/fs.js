var Paths = java.nio.file.Paths;
var Files = java.nio.file.Files;
var FileSystem = function() {
};
FileSystem.prototype.mkdirSync = function(path) {
    if (!path)
        return;
    Files.createDirectories(Paths.get(path));
};
FileSystem.prototype.existsSync = function(path) {
    if (!path)
        return false;
    return Files.isRegularFile(Paths.get(path));
};
FileSystem.prototype.writeFile = function(path, data, options, callback) {
    if (arguments.length == 3) {
        callback = options;
        options = null;
    }
    try {
        if (typeof data === 'string') {
            if (!options || !options.encoding) {
                options = 'UTF-8';
            }
            var encoding = typeof options === 'string' ? options : options.encoding;
            Files.write(Paths.get(path), data.getBytes(encoding));
        }
        else {
            Files.write(Paths.get(path), data);
        }
        callback(null);
    }
    catch (e) {
        var error = new Error(e.toString());
        callback(error);
    }
};
FileSystem.prototype.writeFileSync = function(path, data, options) {
    if (typeof data === 'string') {
        if (arguments.length == 2 || !options || !options.encoding) {
            options = 'UTF-8';
        }
        var encoding = typeof options === 'string' ? options : options.encoding;
        Files.write(Paths.get(path), data.getBytes(encoding));
    }
    else {
        Files.write(Paths.get(path), data);
    }
};
FileSystem.prototype.readFile = function(path, options, callback) {
    if (arguments.length == 2) {
        callback = options;
        options = null;
    }
    try {
        var encoding = typeof options === 'string' ? options:(options ? options.encoding : null);
        var bytes = Files.readAllBytes(Paths.get(path));
        callback(null, encoding ? new java.lang.String(bytes, encoding) : bytes);
    }
    catch (e) {
        var error = new Error(e.toString());
        callback(error, null);
    }
};
FileSystem.prototype.readFileSync = function(path, options) {
    var encoding = typeof options === 'string' ? options:(options ? options.encoding : null);
    var bytes = Files.readAllBytes(Paths.get(path));
    return encoding ? new java.lang.String(bytes, encoding) : bytes;
};
FileSystem.prototype.readdirSync = function(path, options) {
    var dir = Paths.get(path);
    var list = Files.list(dir).collect(java.util.stream.Collectors.toList());
    var ret = []
    for(var i = 0; i < list.length; i++) {
        ret[i] = dir.relativize(list[i]).toString();
    }
    return ret;
};
FileSystem.prototype.lstatSync = function(path) {
    return {
        isFile: isFile,
        isDirectory: isDirectory
    };
    function isFile() {
        return Files.isRegularFile(Paths.get(path));
    }
    function isDirectory() {
        return Files.isDirectory(Paths.get(path));
    }
};

module.exports = new FileSystem();