import functionRegistry from '../functions/function-registry.js';
import LessError from '../less-error.js';

class AbstractPluginLoader {
    constructor() {
        // Implemented by Node.js plugin loader
        this.require = function() {
            return null;
        }
    }

    evalPlugin(contents, context, imports, pluginOptions, fileInfo) {

        let loader, registry, pluginObj, localModule, pluginManager, filename, result;

        pluginManager = context.pluginManager;

        if (fileInfo) {
            if (typeof fileInfo === 'string') {
                filename = fileInfo;
            }
            else {
                filename = fileInfo.filename;
            }
        }
        const shortname = (new this.less.FileManager()).extractUrlParts(filename).filename;

        if (filename) {
            pluginObj = pluginManager.get(filename);

            if (pluginObj) {
                result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions);
                if (result) {
                    return result;
                }
                try {
                    if (pluginObj.use) {
                        pluginObj.use.call(this.context, pluginObj);
                    }
                }
                catch (e) {
                    e.message = e.message || 'Error during @plugin call';
                    return new LessError(e, imports, filename);
                }
                return pluginObj;
            }
        }
        localModule = {
            exports: {},
            pluginManager,
            fileInfo
        };
        registry = functionRegistry.create();

        const registerPlugin = function(obj) {
            pluginObj = obj;
        };

        try {
            loader = new Function('module', 'require', 'registerPlugin', 'functions', 'tree', 'less', 'fileInfo', contents);
            loader(localModule, this.require(filename), registerPlugin, registry, this.less.tree, this.less, fileInfo);
        }
        catch (e) {
            return new LessError(e, imports, filename);
        }

        if (!pluginObj) {
            pluginObj = localModule.exports;
        }
        pluginObj = this.validatePlugin(pluginObj, filename, shortname);

        if (pluginObj instanceof LessError) {
            return pluginObj;
        }

        if (pluginObj) {
            pluginObj.imports = imports;
            pluginObj.filename = filename;

            // For < 3.x (or unspecified minVersion) - setOptions() before install()
            if (!pluginObj.minVersion || this.compareVersion('3.0.0', pluginObj.minVersion) < 0) {
                result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions);

                if (result) {
                    return result;
                }
            }

            // Run on first load
            pluginManager.addPlugin(pluginObj, fileInfo.filename, registry);
            pluginObj.functions = registry.getLocalFunctions();

            // Need to call setOptions again because the pluginObj might have functions
            result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions);
            if (result) {
                return result;
            }

            // Run every @plugin call
            try {
                if (pluginObj.use) {
                    pluginObj.use.call(this.context, pluginObj);
                }
            }
            catch (e) {
                e.message = e.message || 'Error during @plugin call';
                return new LessError(e, imports, filename);
            }

        }
        else {
            return new LessError({ message: 'Not a valid plugin' }, imports, filename);
        }

        return pluginObj;

    }

    trySetOptions(plugin, filename, name, options) {
        if (options && !plugin.setOptions) {
            return new LessError({
                message: `Options have been provided but the plugin ${name} does not support any options.`
            });
        }
        try {
            plugin.setOptions && plugin.setOptions(options);
        }
        catch (e) {
            return new LessError(e);
        }
    }

    validatePlugin(plugin, filename, name) {
        if (plugin) {
            // support plugins being a function
            // so that the plugin can be more usable programmatically
            if (typeof plugin === 'function') {
                plugin = new plugin();
            }

            if (plugin.minVersion) {
                if (this.compareVersion(plugin.minVersion, this.less.version) < 0) {
                    return new LessError({
                        message: `Plugin ${name} requires version ${this.versionToString(plugin.minVersion)}`
                    });
                }
            }
            return plugin;
        }
        return null;
    }

    compareVersion(aVersion, bVersion) {
        if (typeof aVersion === 'string') {
            aVersion = aVersion.match(/^(\d+)\.?(\d+)?\.?(\d+)?/);
            aVersion.shift();
        }
        for (let i = 0; i < aVersion.length; i++) {
            if (aVersion[i] !== bVersion[i]) {
                return parseInt(aVersion[i]) > parseInt(bVersion[i]) ? -1 : 1;
            }
        }
        return 0;
    }

    versionToString(version) {
        let versionString = '';
        for (let i = 0; i < version.length; i++) {
            versionString += (versionString ? '.' : '') + version[i];
        }
        return versionString;
    }

    printUsage(plugins) {
        for (let i = 0; i < plugins.length; i++) {
            const plugin = plugins[i];
            if (plugin.printUsage) {
                plugin.printUsage();
            }
        }
    }
}

export default AbstractPluginLoader;
