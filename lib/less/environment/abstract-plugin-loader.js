var functionRegistry = require("../functions/function-registry"),
    LessError = require('../less-error');

var AbstractPluginLoader = function() {
};

function error(msg, type) {
    throw new LessError(
        {
            type: type || 'Syntax',
            message: msg
        }
    );
}
AbstractPluginLoader.prototype.evalPlugin = function(contents, context, imports, pluginOptions, fileInfo) {

    var loader,
        registry,
        pluginObj,
        localModule,
        pluginManager,
        filename;

    pluginManager = context.pluginManager;

    if (fileInfo) {
        if (typeof fileInfo === "string") {
            filename = fileInfo;
        }
        else {
            filename = fileInfo.filename;
        }
    }
    var shortname = (new this.less.FileManager()).extractUrlParts(filename).filename;

    if (filename) {
        pluginObj = pluginManager.get(filename);

        if (pluginObj) {
            this.trySetOptions(pluginObj, filename, shortname, pluginOptions);
            try {
                if (pluginObj.use) {
                    pluginObj.use.call(this.context, pluginObj);
                }
            }
            catch (e) {
                e.message = 'Error during @plugin call';
                return new this.less.LessError(e, imports, filename);
            }
            return pluginObj;
        }
    }
    localModule = {
        exports: {},
        pluginManager: pluginManager,
        fileInfo: fileInfo
    };
    registry = functionRegistry.create();

    var registerPlugin = function(obj) {
        pluginObj = obj;
    };

    try {
        loader = new Function("module", "require", "registerPlugin", "functions", "tree", "less", "fileInfo", contents);
        loader(localModule, this.require, registerPlugin, registry, this.less.tree, this.less, fileInfo);
    } catch (e) {
        return new this.less.LessError(e, imports, filename);
    }

    if (!pluginObj) {
        pluginObj = localModule.exports;
    }
    pluginObj = this.validatePlugin(pluginObj, filename, shortname);

    if (pluginObj) {
        // Run on first load
        pluginManager.addPlugin(pluginObj, fileInfo.filename, registry);
        pluginObj.functions = registry.getLocalFunctions();
        pluginObj.imports = imports;
        pluginObj.filename = filename;

        this.trySetOptions(pluginObj, filename, shortname, pluginOptions);

        // Run every @plugin call
        try {
            if (pluginObj.use) {
                pluginObj.use.call(this.context, pluginObj);
            }
        }
        catch (e) {
            e.message = 'Error during @plugin call';
            return new this.less.LessError(e, imports, filename);
        }

    }
    else {
        return new this.less.LessError({ message: "Not a valid plugin" });
    }

    return pluginObj;

};

AbstractPluginLoader.prototype.trySetOptions = function(plugin, filename, name, options) {
    if (options) {
        if (!plugin.setOptions) {
            error("Options have been provided but the plugin " + name + " does not support any options.");
            return null;
        }
        try {
            plugin.setOptions(options);
        }
        catch (e) {
            error("Error setting options on plugin " + name + '\n' + e.message);
            return null;
        }
    }
};

AbstractPluginLoader.prototype.validatePlugin = function(plugin, filename, name) {
    if (plugin) {
        // support plugins being a function
        // so that the plugin can be more usable programmatically
        if (typeof plugin === "function") {
            plugin = new plugin();
        }

        if (plugin.minVersion) {
            if (this.compareVersion(plugin.minVersion, this.less.version) < 0) {
                error("Plugin " + name + " requires version " + this.versionToString(plugin.minVersion));
                return null;
            }
        }
        return plugin;
    }
    return null;
};

AbstractPluginLoader.prototype.compareVersion = function(aVersion, bVersion) {
    if (typeof aVersion === "string") {
        aVersion = aVersion.match(/^(\d+)\.?(\d+)?\.?(\d+)?/);
        aVersion.shift();
    }
    for (var i = 0; i < aVersion.length; i++) {
        if (aVersion[i] !== bVersion[i]) {
            return parseInt(aVersion[i]) > parseInt(bVersion[i]) ? -1 : 1;
        }
    }
    return 0;
};
AbstractPluginLoader.prototype.versionToString = function(version) {
    var versionString = "";
    for (var i = 0; i < version.length; i++) {
        versionString += (versionString ? "." : "") + version[i];
    }
    return versionString;
};
AbstractPluginLoader.prototype.printUsage = function(plugins) {
    for (var i = 0; i < plugins.length; i++) {
        var plugin = plugins[i];
        if (plugin.printUsage) {
            plugin.printUsage();
        }
    }
};

module.exports = AbstractPluginLoader;

