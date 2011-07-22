(function(tree) {

tree.Directive = function Directive(name, value) {
    this.name = name;
    if (Array.isArray(value)) {
        this.ruleset = new tree.Ruleset([], value);
    } else {
        this.value = value;
    }
};
tree.Directive.prototype = {
    toString: function(ctx, env) {
        if (this.ruleset) {
            this.ruleset.root = true;
            return this.name + ' {\n  ' +
                   this.ruleset.toString(ctx, env).trim().replace(/\n/g, '\n  ') +
                               '\n}\n';
        } else {
            return this.name + ' ' + this.value.toString() + ';\n';
        }
    },
    eval: function(env) {
        env.frames.unshift(this);
        this.ruleset = this.ruleset && this.ruleset.eval(env);
        env.frames.shift();
        return this;
    },
    variable: function(name) { return tree.Ruleset.prototype.variable.call(this.ruleset, name) },
    find: function() { return tree.Ruleset.prototype.find.apply(this.ruleset, arguments) },
    rulesets: function() { return tree.Ruleset.prototype.rulesets.apply(this.ruleset) }
};

})(require('../tree'));
