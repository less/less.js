/* global window */

var AbstractPluginLoader = require("../less/environment/abstract-plugin-loader.js");

/**
 * Browser Plugin Loader
 */
var PluginLoader = function(less) {
    this.less = less;
    this.require = require;
};

PluginLoader.prototype = new AbstractPluginLoader();

PluginLoader.prototype.tryLoadPlugin = function(name, basePath, callback) {
    var self = this;
    var prefix = name.slice(0, 1);
    var explicit = prefix === "." || prefix === "/" || name.slice(-3).toLowerCase() === ".js";
    this.tryLoadFromEnvironment(name, basePath, explicit, function(err, data) {
        if (explicit) {
            callback(err, data);
        }
        else {
            if (!err) {
                callback(null, data);
            }
            else {
                self.tryLoadFromEnvironment('less-plugin-' + name, basePath, explicit, function(err2, data) {
                    callback(err, data);
                });
            }
        }
    });

};

PluginLoader.prototype.tryLoadFromEnvironment = function(filename, basePath, explicit, callback) {
    var fileManager = new this.less.FileManager(),
        extract = fileManager.extractUrlParts;

    if (basePath) {
        filename = (extract(filename, basePath)).url;
    }

    if (extract(filename).hostPart !== extract(window.location.href).hostPart) {
        callback({ message: 'Cross Site Scripting (XSS) plugins are not allowed'});
    }

    if (filename) {

        filename = fileManager.tryAppendExtension(filename, '.js');
        
        var done = function(err, data) {
            if (err) {
                callback(err);
            } else {
                callback(null, data);
            }
        };
        fileManager.loadFile(filename, null, null, null, done);

    }
    else {
        callback({ message: 'Plugin could not be found.'});
    }
};

module.exports = PluginLoader;

