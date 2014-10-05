var functionRegistry = require("./function-registry");

var functionCaller = function(name, context, index, currentFileInfo) {
    this.name = name.toLowerCase();
    this.function = functionRegistry.get(this.name);
    this.index = index;
    this.context = context;
    this.currentFileInfo = currentFileInfo;
};
functionCaller.prototype.isValid = function() {
    return Boolean(this.function);
};
functionCaller.prototype.call = function(args) {
    return this.function.apply(this, args);
};

module.exports = functionCaller;
