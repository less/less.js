if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Directive = function Directive(name, value) {
    this.name = name;
    if (Array.isArray(value)) {
        this.rules = new(tree.Ruleset)([], value);
    } else {
        this.value = value;
    }
};
tree.Directive.prototype.toCSS = function (ctx, env) {
    if (this.rules) {
        this.rules.root = true;
        return this.name + ' {\n  ' +
               this.rules.toCSS(ctx, env).trim().replace(/\n/g, '\n  ') + '\n}\n';
    } else {
        return this.name + ' ' + this.value.toCSS() + ';\n';
    }
};
tree.Directive.prototype.eval = function (env) {
    this.rules && this.rules.evalRules(env);
    return this;
}
