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
            if (str === '..' || str === './') {
                return require(path.join(prefix, id));
            }
            else {
                return require(id);
            }
        };
    };
};

PluginLoader.prototype = new AbstractPluginLoader();

PluginLoader.prototype.tryLoadPlugin = function(name, basePath, callback) {
    var self = this;
    var prefix = name.slice(0, 1);
    var explicit = prefix === "." || prefix === "/" || name.slice(-3).toLowerCase() === ".js";
    if (explicit) {
        this.tryLoadFromEnvironment(name, basePath, explicit, callback);
    }
    else {
        this.tryLoadFromEnvironment('less-plugin-' + name, basePath, explicit, function(err, data) {
            if (!err) {
                callback(null, data);
            }
            else {
                self.tryLoadFromEnvironment(name, basePath, explicit, callback);
            }
        });
    }

};

PluginLoader.prototype.tryLoadFromEnvironment = function(name, basePath, explicit, callback) {
    var filename = name;
    var self = this;

    function getFile(filename) {
        var fileManager = new self.less.FileManager();

        filename = fileManager.tryAppendExtension(filename, '.js');
        fileManager.loadFile(filename).then(
            function(data) {
                try {
                    self.require = self.requireRelative(filename);
                }
                catch (e) {
                    callback(e);
                }
                callback(null, data);
            }, 

            function(err) {
                callback(err);
            }
        );
    }
    if (explicit) {
        if (basePath) {
            filename = path.join(basePath, name);
        }
        getFile(filename);
    }
    else {
        // Search node_modules for a possible plugin name match
        try {
            filename = require.resolve(path.join("../../../", name));
        }
        catch (e) {
        }
        // is installed as a sub dependency of the current folder
        try {
            filename = require.resolve(path.join(process.cwd(), "node_modules", name));
        }
        catch (e) {
        }
        // is referenced relative to the current directory
        try {
            filename = require.resolve(path.join(process.cwd(), name));
        }
        catch (e) {
        }
        // unlikely - would have to be a dependency of where this code was running (less.js)...
        if (name[0] !== '.') {
            try {
                filename = require.resolve(name);
            }
            catch (e) {
            }
        }
        if (basePath) {
            filename = path.join(basePath, name);
        }
        if (filename) {
            getFile(filename);
        }
        else {
            callback({ message: 'Plugin could not be found.'});
        }
    }
};

module.exports = PluginLoader;

