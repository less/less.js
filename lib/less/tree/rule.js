(function (tree) {

tree.Rule = function (name, value, index) {
    this.name = name;
    this.value = (value instanceof tree.Value) ? value : new(tree.Value)([value]);
    this.index = index;

    if (name.charAt(0) === '@') {
        this.variable = true;
    } else { this.variable = false }
};
tree.Rule.prototype.toCSS = function (env) {
    if (this.variable) { return "" }
    else {
        return this.name + (env.compress ? ':' : ': ') + this.value.toCSS(env) + ";";
    }
};

tree.Rule.prototype.eval = function (context) {
    return new(tree.Rule)(this.name, this.value.eval(context));
};

tree.Shorthand = function (a, b) {
    this.a = a;
    this.b = b;
};

tree.Shorthand.prototype = {
    toCSS: function (env) {
        return this.a.toCSS(env) + "/" + this.b.toCSS(env);
    },
    eval: function () { return this }
};

})(require('less/tree'));
