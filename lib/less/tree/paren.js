module.exports = function (tree) {

var Paren = function (node) {
    this.value = node;
};
Paren.prototype = {
    type: "Paren",
    accept: function (visitor) {
        this.value = visitor.visit(this.value);
    },
    genCSS: function (env, output) {
        output.add('(');
        this.value.genCSS(env, output);
        output.add(')');
    },
    toCSS: tree.toCSS,
    eval: function (env) {
        return new(Paren)(this.value.eval(env));
    }
};
return Paren;
};
