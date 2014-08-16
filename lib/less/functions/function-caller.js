module.exports = function(functions) {
var functionCaller = function(name, env, currentFileInfo) {
    this.name = name.toLowerCase();
    this.function = functions.functionRegistry.get(this.name);
    this.env = env;
    this.currentFileInfo = currentFileInfo;
};
functionCaller.prototype.isValid = function() {
    return Boolean(this.function);
};
functionCaller.prototype.call = function(args) {
    return this.function.apply(this, args);
};
return functionCaller;
};
