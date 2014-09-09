var functionRegistry = require("./function-registry");

var functionCaller = function(name, env, index, currentFileInfo) {
    this.name = name.toLowerCase();
    this.function = functionRegistry.get(this.name);
    this.index = index;
    this.env = env;
    this.currentFileInfo = currentFileInfo;
};
functionCaller.prototype.isValid = function() {
    return Boolean(this.function);
};
functionCaller.prototype.call = function(args) {
    return this.function.apply(this, args);
};

module.exports = functionCaller;
