var environment = function(externalEnvironment, fileManagers) {
    this.fileManagers = fileManagers || [];
    var optionalFunctions = ["encodeBase64", "mimeLookup", "charsetLookup", "getSourceMapGenerator"],
        requiredFunctions = ["warn"],
        functions = requiredFunctions.concat(optionalFunctions);

    for(var i = 0; i < functions.length; i++) {
        var propName = functions[i],
            environmentFunc = externalEnvironment[propName];
        if (environmentFunc) {
            this[propName] = environmentFunc.bind(externalEnvironment);
        } else if (i < requiredFunctions.length) {
            this.warn("missing required function in environment - " + propName);
        }
    }
};

environment.prototype.warn = function (msg) {
};

environment.prototype.getFileManager = function (filename, currentDirectory, options, environment, isSync) {
    for(var i = this.fileManagers.length - 1; i >= 0 ; i--) {
        var fileManager = this.fileManagers[i];
        if (fileManager[isSync ? "supportsSync" : "supports"](filename, currentDirectory, options, environment)) {
            return fileManager;
        }
    }
    return null;
};

environment.prototype.addFileManager = function (fileManager) {
    this.fileManagers.push(fileManager);
};

environment.prototype.clearFileManagers = function () {
    this.fileManagers = [];
};

module.exports = environment;
