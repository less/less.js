var Node = require("./node.js"),
    Operation = require("./operation.js"),
    Dimension = require("./dimension.js");

var Negative = function (node) {
    this.value = node;
};
Negative.prototype = new Node();
Negative.prototype.type = "Negative";
Negative.prototype.genCSS = function (env, output) {
    output.add('-');
    this.value.genCSS(env, output);
};
Negative.prototype.eval = function (env) {
    if (env.isMathOn()) {
        return (new(Operation)('*', [new(Dimension)(-1), this.value])).eval(env);
    }
    return new(Negative)(this.value.eval(env));
};
module.exports = Negative;
