var Node = require("./node");

var Paren = function (node) {
    this.value = node;
};
Paren.prototype = new Node();
Paren.prototype.type = "Paren";
Paren.prototype.genCSS = function (env, output) {
    output.add('(');
    this.value.genCSS(env, output);
    output.add(')');
};
Paren.prototype.eval = function (env) {
    return new(Paren)(this.value.eval(env));
};
module.exports = Paren;
