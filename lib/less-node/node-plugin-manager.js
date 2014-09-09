var PluginManager = require("../less/plugin-manager");
/**
 * Node Plugin Manager
 */
var NodePluginManager = function(less) {
    PluginManager.call(this, less);
};
NodePluginManager.prototype = new PluginManager();
NodePluginManager.prototype.interpretCommandLineArgument = function(name, argument) {
    var plugin = this.tryRequirePlugin(name);
    if (plugin) {
        this.addPlugin(plugin);
        return true;
    }
    return false;
};
NodePluginManager.prototype.tryRequirePlugin = function(name) {
    try {
        return require("less-plugin-"+name);
    }
    catch(e) {
    }
    try {
        return require("../../../less-plugin-"+name);
    }
    catch(e) {
    }
};
module.exports = NodePluginManager;
