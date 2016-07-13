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
AbstractPluginLoader.prototype.evalPlugin = function(contents, context, pluginOptions, fileInfo) {

    var loader,
        registry,
        pluginObj,
        localModule,
        localExports,
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
    if (filename) {
        pluginObj = pluginManager.get(filename);

        if (pluginObj) {
            this.trySetOptions(pluginObj, filename, pluginOptions);
            if (pluginObj.use) {
                pluginObj.use(this.less);
            }
            return pluginObj;
        }
    }
    localModule = {
        exports: {},
        pluginManager: pluginManager,
        fileInfo: fileInfo
    };
    localExports = localModule.exports;
    registry = functionRegistry.create();

    try {
        loader = new Function("module", "require", "functions", "tree", "fileInfo", "less", contents);
        pluginObj = loader(localModule, this.require, registry, this.less.tree, fileInfo, this.less);

        if (!pluginObj) {
            pluginObj = localModule.exports;
        }

        pluginObj = this.validatePlugin(pluginObj, filename);

        if (pluginObj) {
            // Run on first load
            pluginManager.addPlugin(pluginObj, fileInfo.filename);
            pluginObj.functions = registry.getLocalFunctions();

            this.trySetOptions(pluginObj, filename, pluginOptions);

            // Run every @plugin call
            if (pluginObj.use) {
                pluginObj.use(this.less);
            }
        }
        else {
            throw new SyntaxError("Not a valid plugin");
        }

    } catch(e) {
        // TODO pass the error
        console.log(e);
        return new this.less.LessError({
            message: "Plugin evaluation error: '" + e.name + ': ' + e.message.replace(/["]/g, "'") + "'" ,
            filename: filename,
            line: this.line,
            col: this.column
        });
    }

    return pluginObj;

};

AbstractPluginLoader.prototype.trySetOptions = function(plugin, filename, options) {
    var name = require('path').basename(filename);
    if (options) {
        if (!plugin.setOptions) {
            error("Options have been provided but the plugin " + name + " does not support any options.");
            return null;
        }
        try {
            plugin.setOptions(options);
        }
        catch(e) {
            error("Error setting options on plugin " + name + '\n' + e.message);
            return null;
        }
    }
};

AbstractPluginLoader.prototype.validatePlugin = function(plugin, filename) {
    if (plugin) {
        // support plugins being a function
        // so that the plugin can be more usable programmatically
        if (typeof plugin === "function") {
            plugin = new plugin();
        }
        var name = require('path').basename(filename);
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

