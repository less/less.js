var Node = require("./node");

var Assignment = function (key, val) {
    this.key = key;
    this.value = val;
};

Assignment.prototype = new Node();
Assignment.prototype.type = "Assignment";
Assignment.prototype.accept = function (visitor) {
    this.value = visitor.visit(this.value);
};
Assignment.prototype.eval = function (env) {
    if (this.value.eval) {
        return new(Assignment)(this.key, this.value.eval(env));
    }
    return this;
};
Assignment.prototype.genCSS = function (env, output) {
    output.add(this.key + '=');
    if (this.value.genCSS) {
        this.value.genCSS(env, output);
    } else {
        output.add(this.value);
    }
};
module.exports = Assignment;

