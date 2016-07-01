var path = require("path"),
    AbstractPluginLoader = require("../less/environment/abstract-plugin-loader.js");

/**
 * Browser Plugin Loader
 */
var PluginLoader = function(less) {
    this.less = less;
    this.require = require;
};

PluginLoader.prototype = new AbstractPluginLoader();

PluginLoader.prototype.tryLoadFromEnvironment = function(filename, basePath, callback) {

    if(basePath && !filename) {
        filename = path.join(basePath, name);
    }
    if(filename) {
        var fileManager = new this.less.FileManager();

        filename = fileManager.tryAppendExtension(filename,'.js');
        fileManager.loadFile(filename).then(
            function(data) {
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

