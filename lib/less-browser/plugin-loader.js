/* global window */

import AbstractPluginLoader from "../less/environment/abstract-plugin-loader";

/**
 * Browser Plugin Loader
 */
export default class PluginLoader extends AbstractPluginLoader {
    constructor(less) {
        super();
        this.less = less;
        this.require = require;
    }

    tryLoadPlugin(name, basePath, callback) {
        const prefix = name.slice(0, 1);
        const explicit = prefix === "." || prefix === "/" || name.slice(-3).toLowerCase() === ".js";
        this.tryLoadFromEnvironment(name, basePath, explicit, (err, data) => {
            if (explicit) {
                callback(err, data);
            }
            else {
                if (!err) {
                    callback(null, data);
                }
                else {
                    this.tryLoadFromEnvironment('less-plugin-' + name, basePath, explicit, (err2, data) => {
                        callback(err, data);
                    });
                }
            }
        });

    }

    tryLoadFromEnvironment(filename, basePath, explicit, callback) {
        const fileManager = new this.less.FileManager();
        const extract = fileManager.extractUrlParts;

        if (basePath) {
            filename = (extract(filename, basePath)).url;
        }

        if (extract(filename).hostPart !== extract(window.location.href).hostPart) {
            callback({ message: 'Cross Site Scripting (XSS) plugins are not allowed'});
        }

        if (filename) {

            filename = fileManager.tryAppendExtension(filename, '.js');
            
            const done = (err, data) => {
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
    }
}
