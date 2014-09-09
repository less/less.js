/**
 * Plugin Manager
 */
var PluginManager = function(less) {
    this.less = less;
    this.visitors = [];
};
PluginManager.prototype.addPlugin = function(plugin) {
    plugin.install(this.less, this);
};
PluginManager.prototype.addVisitor = function(visitor) {
    this.visitors.push(visitor);
};
PluginManager.prototype.getVisitors = function() {
    return this.visitors;
};
module.exports = PluginManager;
