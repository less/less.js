/**
 * Node Plugin Loader
 */
var PluginLoader = function(less) {
    this.less = less;
};
PluginLoader.prototype.tryLoadPlugin = function(name, argument) {
    var plugin = this.tryRequirePlugin(name);
    if (plugin) {
        if (plugin.minVersion) {
            if (this.compareVersion(plugin.minVersion, this.less.version) < 0) {
                console.log("plugin " + name + " requires version " + this.versionToString(plugin.minVersion));
                return null;
            }
        } else {
            console.log("plugin has no min version");
        }
        if (argument) {
            plugin.setOptions(argument);
        }
        return plugin;
    }
    return null;
};
PluginLoader.prototype.compareVersion = function(aVersion, bVersion) {
    for(var i = 0; i < aVersion.length; i++) {
        if (aVersion[i] !== bVersion[i]) {
            return aVersion[i] > bVersion[i] ? -1 : 1;
        }
    }
    return 0;
};
PluginLoader.prototype.versionToString = function(version) {
    var versionString = "";
    for(var i = 0; i < version.length; i++) {
        versionString += (versionString ? "." : "") + version[i];
    }
    return versionString;
};
PluginLoader.prototype.tryRequirePlugin = function(name) {
    if (name[0] !== '.') {
        try {
            return require(name);
        }
        catch(e) {
        }
    }
    try {
        return require("../../../" + name);
    }
    catch(e) {
    }
};
PluginLoader.prototype.printUsage = function(plugins) {
    for(var i = 0; i < plugins.length; i++) {
        var plugin = plugins[i];
        if (plugin.printUsage) {
            plugin.printUsage();
        }
    }
};
module.exports = PluginLoader;
