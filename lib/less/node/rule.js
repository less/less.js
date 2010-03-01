if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Rule = function Rule(name, value) {
    this.name = name;
    this.value = value;

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

tree.Value = function Value(value) {
    this.value = value;
    this.is = 'value';
};
tree.Value.prototype.eval = function (env) {
    if (this.value.length === 1) {
        return this.value[0].eval(env);
    } else {
        throw new(Error)("trying to evaluate compound value");
    }
};
tree.Value.prototype.toCSS = function (env) {
    return this.value.map(function (e) {
        return e.toCSS ? e.toCSS(env) : e;
    }).join(', ');
};

