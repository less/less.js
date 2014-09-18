var PluginManager = require("../less/plugin-manager");
/**
 * Node Plugin Manager
 */
var NodePluginManager = function(less) {
    PluginManager.call(this, less);
};
NodePluginManager.prototype = new PluginManager();
NodePluginManager.prototype.tryLoadPlugin = function(name, argument) {
    var plugin = this.tryRequirePlugin(name);
    if (plugin) {
        if (plugin.minVersion) {
            if (this.compareVersion(plugin.minVersion, this.less.version) < 0) {
                console.log("plugin " + name + " requires version " + this.versionToString(plugin.minVersion));
                return false;
            }
        } else {
            console.log("plugin has no min version");
        }
        this.addPlugin(plugin, argument);
        return true;
    }
    return false;
};
NodePluginManager.prototype.compareVersion = function(aVersion, bVersion) {
    for(var i = 0; i < aVersion.length; i++) {
        if (aVersion[i] !== bVersion[i]) {
            return aVersion[i] > bVersion[i] ? -1 : 1;
        }
    }
    return 0;
};
NodePluginManager.prototype.versionToString = function(version) {
    var versionString = "";
    for(var i = 0; i < version.length; i++) {
        versionString += (versionString ? "." : "") + version[i];
    }
    return versionString;
};
NodePluginManager.prototype.tryRequirePlugin = function(name) {
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
NodePluginManager.prototype.printUsage = function() {
    for(var i = 0; i < this.installedPlugins.length; i++) {
        var plugin = this.installedPlugins[i];
        if (plugin.printUsage) {
            plugin.printUsage();
        }
    }
};
module.exports = NodePluginManager;
