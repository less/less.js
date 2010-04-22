if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Rule = function Rule(name, value) {
    this.name = name;
    this.value = (value instanceof tree.Value) ? value : new(tree.Value)([value]);

    if (name.charAt(0) === '@') {
        this.variable = true;
    } else { this.variable = false }
};
tree.Rule.prototype.toCSS = function (env) {
    if (this.variable) { return "" }
    else {
        return this.name + ": " +
              (this.value.toCSS ? this.value.toCSS(env) : this.value) + ";";
    }
};

tree.Rule.prototype.eval = function (context) {
    return new(tree.Rule)(this.name, this.value.eval(context));
};

tree.Value = function Value(value) {
    this.value = value;
    this.is = 'value';
};
tree.Value.prototype = {
    eval: function (env) {
        if (this.value.length === 1) {
            return this.value[0].eval(env);
        } else {
            return this;
        }
    },
    toCSS: function (env) {
        return this.value.map(function (e) {
            return e.toCSS ? e.toCSS(env) : e;
        }).join(', ');
    }
};

tree.Shorthand = function Shorthand(a, b) {
    this.a = a;
    this.b = b;
};

tree.Shorthand.prototype = {
    toCSS: function (env) {
        return this.a.toCSS(env) + "/" + this.b.toCSS(env);
    }
};
