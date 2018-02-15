// TODO: Add tests for browser @plugin
/*global window */

var AbstractPluginLoader = require("../less/environment/abstract-plugin-loader.js");

/**
 * Browser Plugin Loader
 */
var PluginLoader = function(less) {
    this.less = less;
    // shim for browser require?
    this.require = require;
};

PluginLoader.prototype = new AbstractPluginLoader();

PluginLoader.prototype.loadPlugin = function(filename, basePath, context, environment, fileManager) {
    return new Promise(function(fulfill, reject) {
        fileManager.loadFile(filename, basePath, context, environment)
            .then(fulfill).catch(reject);
    });
};

module.exports = PluginLoader;

