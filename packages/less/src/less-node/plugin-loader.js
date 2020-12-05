import path from 'path';
import AbstractPluginLoader from '../less/environment/abstract-plugin-loader.js';

/**
 * Node Plugin Loader
 */
const PluginLoader = function(less) {
    this.less = less;
    this.require = prefix => {
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
};

PluginLoader.prototype = Object.assign(new AbstractPluginLoader(), {
    loadPlugin(filename, basePath, context, environment, fileManager) {
        const prefix = filename.slice(0, 1);
        const explicit = prefix === '.' || prefix === '/' || filename.slice(-3).toLowerCase() === '.js';
        if (!explicit) {
            context.prefixes = ['less-plugin-', ''];
        }

        if (context.syncImport) {
            return fileManager.loadFileSync(filename, basePath, context, environment);
        }

        return new Promise((fulfill, reject) => {
            fileManager.loadFile(filename, basePath, context, environment).then(
                data => {
                    try {
                        fulfill(data);
                    }
                    catch (e) {
                        console.log(e);
                        reject(e);
                    }
                }
            ).catch(err => {
                reject(err);
            });
        });
    },

    loadPluginSync(filename, basePath, context, environment, fileManager) {
        context.syncImport = true;
        return this.loadPlugin(filename, basePath, context, environment, fileManager);
    }
});

export default PluginLoader;

