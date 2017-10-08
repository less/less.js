// TODO: Add tests for browser @plugin
/*global window */

var AbstractPluginLoader = require("../less/environment/abstract-plugin-loader.js");

/**
 * Browser Plugin Loader
 */
var PluginLoader = function(less) {
    this.less = less;
    this.require = require;
};

PluginLoader.prototype = new AbstractPluginLoader();

PluginLoader.prototype.loadPlugin = function(filename, basePath, context, environment, fileManager) {
    var self = this;

    return new Promise(function(fulfill, reject) {
        fileManager.loadFile(filename, basePath, context, environment).then(
            function(data) {
                try {
                    self.require = self.requireRelative(data.filename);
                    fulfill(data);
                }
                catch (e) {
                    reject(e);
                }
            }
        ).catch(function(err) {
            reject(err);
        });
    });
        
};

module.exports = PluginLoader;

