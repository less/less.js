var path = require("path"),
    AbstractPluginLoader = require("../less/environment/abstract-plugin-loader.js");

/**
 * Node Plugin Loader
 */
var PluginLoader = function(less) {
    this.less = less;
    this.require = require;
    this.requireRelative = function(prefix) {
        prefix = path.dirname(prefix);
        return function(id) {
            var str = id.substr(0, 2);
            if(str === '..' || str === './') {
                return require(path.join(prefix, id));
            }
            else {
                return require(id);
            }
        }
    };
};

PluginLoader.prototype = new AbstractPluginLoader();

PluginLoader.prototype.tryLoadFromEnvironment = function(name, basePath, callback) {
    var filename;
    var self = this;

    try {
        filename = require.resolve(path.join("../../../", name));
    }
    catch(e) {
    }
    // is installed as a sub dependency of the current folder
    try {
        filename = require.resolve(path.join(process.cwd(), "node_modules", name));
    }
    catch(e) {
    }
    // is referenced relative to the current directory
    try {
        filename = require.resolve(path.join(process.cwd(), name));
    }
    catch(e) {
    }
    // unlikely - would have to be a dependency of where this code was running (less.js)...
    if (name[0] !== '.') {
        try {
            filename = require.resolve(name);
        }
        catch(e) {
        }
    }
    if(basePath && !filename) {
        filename = path.join(basePath, name);
    }
    if(filename) {
        var fileManager = new this.less.FileManager();

        filename = fileManager.tryAppendExtension(filename,'.js');
        fileManager.loadFile(filename).then(
            function(data) {
                try {
                    self.require = self.requireRelative(filename);
                }
                catch(e) {
                    console.log(e.stack.toString());
                }
                callback(null, data);
            }, 

            function(err) {
                callback(err);
            }
        );
    }
    else {
        callback({ message: 'Plugin could not be found.'});
    }
};

module.exports = PluginLoader;

