import path from "path";
import AbstractPluginLoader from "../less/environment/abstract-plugin-loader.js";

const PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;

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

    loadPlugin(filename, basePath, context, environment, fileManager) {
        const self = this;
        const prefix = filename.slice(0, 1);
        const explicit = prefix === "." || prefix === "/" || filename.slice(-3).toLowerCase() === ".js";
        if (!explicit) {
            context.prefixes = ['less-plugin-', ''];
        }

        return new PromiseConstructor((fulfill, reject) => {
            fileManager.loadFile(filename, basePath, context, environment).then(
                data => {
                    try {
                        self.require = self.requireRelative(data.filename);
                        fulfill(data);
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            ).catch(err => {
                reject(err);
            });
        });
            
    }
}
