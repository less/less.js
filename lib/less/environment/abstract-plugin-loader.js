var functionRegistry = require("../functions/function-registry");
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
AbstractPluginLoader.prototype.evalPlugin = function(contents, context, fileInfo, callback) {

    var loader,
        registry,
        pluginObj,
        localModule,
        localExports;


    pluginObj = context.pluginManager.get(fileInfo.filename);

    if(pluginObj) {
        if(pluginObj.use) {
            pluginObj.use(this.less);
        }
        return callback(null, pluginObj);
    }
    localModule = { 
        exports: {},
        pluginManager: context.pluginManager,
        fileInfo: fileInfo
    };
    localExports = localModule.exports;
    registry = functionRegistry.create();

    try {
        loader = new Function("module", "require", "functions", "tree", "fileInfo", "less", contents);
        pluginObj = loader(localModule, this.require, registry, this.less.tree, fileInfo, this.less);

        if(!pluginObj) {
            pluginObj = localModule.exports;
        }

        pluginObj = this.validatePlugin(pluginObj);
        if(pluginObj) {
            // Run on first load
            context.pluginManager.addPlugin(pluginObj, fileInfo.filename);
            pluginObj.functions = registry.getLocalFunctions();

            // Run every @plugin call
            if(pluginObj.use) {
                pluginObj.use(this.less);
            }
        }
        else {
            throw new Error();
        }

    } catch(e) {
        // TODO pass the error
        console.log(e.stack.toString());
        callback(new this.less.LessError({
            message: "Plugin evaluation error: '" + e.name + ': ' + e.message.replace(/["]/g, "'") + "'" ,
            filename: this.fileInfo.filename,
            line: this.line,
            col: this.column
        }), null );
    }

    callback(null, pluginObj);

};
AbstractPluginLoader.prototype.tryLoadPlugin = function(name, argument, basePath, callback) {
    var self = this;
    this.tryLoadFromEnvironment(name, basePath, function(err, data) {
        if(!err) {
            callback(null, data);
        }
        else {
            self.tryLoadFromEnvironment('less-plugin-' + name, basePath, callback);
        }
    });

};
AbstractPluginLoader.prototype.validatePlugin = function(plugin, argument) {
    if (plugin) {
        // support plugins being a function
        // so that the plugin can be more usable programmatically
        if (typeof plugin === "function") {
            plugin = new plugin();
        }
        if (plugin.minVersion) {
            if (this.compareVersion(plugin.minVersion, this.less.version) < 0) {
                error("plugin " + name + " requires version " + this.versionToString(plugin.minVersion));
                return null;
            }
        }
        if (argument) {
            if (!plugin.setOptions) {
                error("options have been provided but the plugin " + name + "does not support any options");
                return null;
            }
            try {
                plugin.setOptions(argument);
            }
            catch(e) {
                error("Error setting options on plugin " + name + '\n' + e.message);
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

