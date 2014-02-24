module.exports = function (tree) {

var Negative = function (node) {
    this.value = node;
};
Negative.prototype = {
    type: "Negative",
    accept: function (visitor) {
        this.value = visitor.visit(this.value);
    },
    genCSS: function (env, output) {
        output.add('-');
        this.value.genCSS(env, output);
    },
    toCSS: tree.toCSS,
    eval: function (env) {
        if (env.isMathOn()) {
            return (new(tree.Operation)('*', [new(tree.Dimension)(-1), this.value])).eval(env);
        }
        return new(Negative)(this.value.eval(env));
    }
};
return Negative;
};
