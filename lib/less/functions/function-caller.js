var functionRegistry = require("./function-registry.js");

var functionCaller = function(name, env, currentFileInfo) {
    this.name = name.toLowerCase();
    this.function = functionRegistry.get(this.name);
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
