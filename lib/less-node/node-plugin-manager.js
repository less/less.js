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
        this.addPlugin(plugin, argument);
        return true;
    }
    return false;
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
