(function (tree) {

tree.Media = function (value, features) {
    var selectors;

    this.features = features && new(tree.Value)(features);

    if (Array.isArray(value)) {
        selectors = [new(tree.Selector)([new(tree.Element)('&', null, 0)])];
        this.ruleset = new(tree.Ruleset)(selectors, value);
        this.ruleset.allowImports = true;
    } else {
        this.value = value;
    }
};
tree.Media.prototype = {
    toCSS: function (ctx, env) {
        var features = this.features ? ' ' + this.features.toCSS(env) : '';

        if (this.ruleset) {
            this.ruleset.root = (ctx.length === 0);
            return '@media' + features + (env.compress ? '{' : ' {\n  ') +
                   this.ruleset.toCSS(ctx, env).trim().replace(/\n/g, '\n  ') +
                               (env.compress ? '}': '\n}\n');
        } else {
            return '@media ' + this.value.toCSS() + ';\n';
        }
    },
    eval: function (env) {
        this.features = this.features && this.features.eval(env);
        env.frames.unshift(this);
        this.ruleset = this.ruleset && this.ruleset.eval(env);
        env.frames.shift();
        return this;
    },
    variable: function (name) { return tree.Ruleset.prototype.variable.call(this.ruleset, name) },
    find: function () { return tree.Ruleset.prototype.find.apply(this.ruleset, arguments) },
    rulesets: function () { return tree.Ruleset.prototype.rulesets.apply(this.ruleset) }
};

})(require('../tree'));
