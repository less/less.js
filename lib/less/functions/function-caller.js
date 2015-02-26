var functionRegistry = require("./function-registry"),
    Expression = require("../tree/expression");

var functionCaller = function(name, context, index, currentFileInfo) {
    this.name = name.toLowerCase();
    this.func = functionRegistry.get(this.name);
    this.index = index;
    this.context = context;
    this.currentFileInfo = currentFileInfo;
};
functionCaller.prototype.isValid = function() {
    return Boolean(this.func);
};
functionCaller.prototype.call = function(args) {

    // This code is terrible and should be replaced as per this issue...
    // https://github.com/less/less.js/issues/2477
    if (Array.isArray(args)) {
        args = args.filter(function (item) {
            if (item.type === "Comment") {
                return false;
            }
            return true;
        })
        .map(function(item) {
            if (item.type === "Expression") {
                var subNodes = item.value.filter(function (item) {
                    if (item.type === "Comment") {
                        return false;
                    }
                    return true;
                });
                if (subNodes.length === 1) {
                    return subNodes[0];
                } else {
                    return new Expression(subNodes);
                }
            }
            return item;
        });
    }

    return this.func.apply(this, args);
};

module.exports = functionCaller;
