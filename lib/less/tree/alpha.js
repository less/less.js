var Node = require("./node");

var Alpha = function (val) {
    this.value = val;
};
Alpha.prototype = new Node();
Alpha.prototype.type = "Alpha";

Alpha.prototype.accept = function (visitor) {
    this.value = visitor.visit(this.value);
};
Alpha.prototype.eval = function (env) {
    if (this.value.eval) { return new Alpha(this.value.eval(env)); }
    return this;
};
Alpha.prototype.genCSS = function (env, output) {
    output.add("alpha(opacity=");

    if (this.value.genCSS) {
        this.value.genCSS(env, output);
    } else {
        output.add(this.value);
    }

    output.add(")");
};

module.exports = Alpha;
