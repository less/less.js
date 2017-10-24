var Paths = java.nio.file.Paths;
var Path = function() {
};
Path.prototype.sep = java.io.File.separator;
Path.prototype.basename = function(path, removeExtMatching) {
    if (!path || path.startsWith('.'))
        return '';

    var filename = Paths.get(path).getFileName().toString();
    if (filename && removeExtMatching && filename.length >= removeExtMatching.length) {
        var dotIndex = filename.lastIndexOf('.');
        if (dotIndex > -1 && filename.substring(dotIndex).toLowerCase() === removeExtMatching.toLowerCase()) {
            return filename.substring(0, dotIndex);
        }
    }
    return filename;
};
Path.prototype.dirname = function(path) {
    if (!path)
        return '';
    return __rootDir.relativize(Paths.get(path).toAbsolutePath().getParent()).normalize().toString();
};
Path.prototype.extname = function(path) {
    if (!path || path.startsWith('.'))
        return '';
    var filename = Paths.get(path).getFileName().toString();
    var dotIndex = filename.lastIndexOf('.');
    if (dotIndex > -1)
        filename.substring(dotIndex);
    return '';
};
Path.prototype.isAbsolute = function(path) {
    if (!path)
        return false;
    return Paths.get(path).isAbsolute();
};
Path.prototype.join = function() {
    if (arguments.length == 0)
        return '.';
    var path = Paths.get(arguments[0]);
    for(var i = 1; i < arguments.length; i++) {
        path = path.resolve(arguments[i]);
    }
    var lastPath = arguments[arguments.length - 1];
    if (lastPath.endsWith('/') || lastPath.endsWith('\\'))
        return path.normalize().toString() + this.sep;
    else
        return path.normalize().toString();
};
Path.prototype.normalize = function(path) {
    if (!path)
        return '.';
    return Paths.get(path).normalize().toString();
};
Path.prototype.resolve = function() {
    if (arguments.length == 0)
        return __rootDir.toString();
    var path = __rootDir;
    for(var i = 0; i < arguments.length; i++) {
        if (!arguments[i] || arguments[i].length == 0)
            continue;
        path = path.resolve(arguments[i]);
    }
    return path.normalize().toString();
};
Path.prototype.relative = function(from, to) {
    return Paths.get(from).relativize(Paths.get(to)).toString();
};
Path.prototype.existsSync = function(path) {
    if (!path)
        return false;
    return java.nio.file.Files.isRegularFile(Paths.get(path));
};
module.exports = new Path();