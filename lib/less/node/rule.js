
node.Rule = function Rule(name, value) {
    this.name = name;
    this.value = value;

    if (name.charAt(0) === '@') {
        require('sys').puts('NEW VAR, value:' + require('sys').inspect(value))
        this.variable = true;
    } else { this.variable = false }
};
node.Rule.prototype.toCSS = function (env) {
    return this.name + ": " + (this.value.toCSS ? this.value.toCSS(env) : this.value) + ";"; 
};

node.Value = function Value(value) {
    this.value = value;
    this.is = 'value';
};
node.Value.prototype.eval = function (env) {
    if (this.value.length === 1) {
        return this.value[0].eval(env);
    } else {
        throw new(Error)("trying to evaluate compound value");
    }
};
node.Value.prototype.toCSS = function (env) {
    return this.value.map(function (e) {
        return e.toCSS ? e.toCSS(env) : e;
    }).join(', ');
};

