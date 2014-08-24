var Node = require("./node.js");

var Attribute = function (key, op, value) {
    this.key = key;
    this.op = op;
    this.value = value;
};
Attribute.prototype = new Node();
Attribute.prototype.type = "Attribute";
Attribute.prototype.eval = function (env) {
    return new(Attribute)(this.key.eval ? this.key.eval(env) : this.key,
        this.op, (this.value && this.value.eval) ? this.value.eval(env) : this.value);
};
Attribute.prototype.genCSS = function (env, output) {
    output.add(this.toCSS(env));
};
Attribute.prototype.toCSS = function (env) {
    var value = this.key.toCSS ? this.key.toCSS(env) : this.key;

    if (this.op) {
        value += this.op;
        value += (this.value.toCSS ? this.value.toCSS(env) : this.value);
    }

    return '[' + value + ']';
};
module.exports = Attribute;
