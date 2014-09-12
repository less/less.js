/**
 * Plugin Manager
 */
var PluginManager = function(less) {
    this.less = less;
    this.visitors = [];
    this.postProcessors = [];
};
PluginManager.prototype.addPlugin = function(plugin) {
    plugin.install(this.less, this);
};
PluginManager.prototype.addVisitor = function(visitor) {
    this.visitors.push(visitor);
};
/**
 * Adds a post processor object
 * @param {object} postProcessor
 * @param {number} priority - guidelines 1 = before compression, 1000 = compression, 2000 = after compression
 */
PluginManager.prototype.addPostProcessor = function(postProcessor, priority) {
    var indexToInsertAt;
    for(indexToInsertAt = 0; indexToInsertAt < this.postProcessors.length; indexToInsertAt++) {
        if (this.postProcessors[indexToInsertAt].priority >= priority) {
            break;
        }
    }
    this.postProcessors.splice(indexToInsertAt, 0, {postProcessor: postProcessor, priority: priority});
};
PluginManager.prototype.getPostProcessors = function() {
    var postProcessors = [];
    for(var i = 0; i < this.postProcessors.length; i++) {
        postProcessors.push(this.postProcessors[i].postProcessor);
    }
    return postProcessors;
};
PluginManager.prototype.getVisitors = function() {
    return this.visitors;
};
module.exports = PluginManager;
