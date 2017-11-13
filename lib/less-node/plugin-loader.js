import path from "path";
import AbstractPluginLoader from "../less/environment/abstract-plugin-loader";

/**
 * Node Plugin Loader
 */
export default class PluginLoader extends AbstractPluginLoader {
    constructor(less) {
        super();
        this.less = less;
        this.require = require;
        this.requireRelative = prefix => {
            prefix = path.dirname(prefix);
            return id => {
                const str = id.substr(0, 2);
                if (str === '..' || str === './') {
                    return require(path.join(prefix, id));
                }
                else {
                    return require(id);
                }
            };
        };
    }

    tryLoadPlugin(name, basePath, callback) {
        const prefix = name.slice(0, 1);
        const explicit = prefix === "." || prefix === "/" || name.slice(-3).toLowerCase() === ".js";
        if (explicit) {
            this.tryLoadFromEnvironment(name, basePath, explicit, callback);
        }
        else {
            this.tryLoadFromEnvironment('less-plugin-' + name, basePath, explicit, (err, data) => {
                if (!err) {
                    callback(null, data);
                }
                else {
                    this.tryLoadFromEnvironment(name, basePath, explicit, callback);
                }
            });
        }

    }

    tryLoadFromEnvironment(name, basePath, explicit, callback) {
        let filename = name;

        const getFile = (filename) => {
            const fileManager = new this.less.FileManager();

            filename = fileManager.tryAppendExtension(filename, '.js');
            fileManager.loadFile(filename).then(
                data => {
                    try {
                        this.require = this.requireRelative(filename);
                    }
                    catch (e) {
                        callback(e);
                    }
                    callback(null, data);
                }, 

                err => {
                    callback(err);
                }
            );
        };
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
    }
}
