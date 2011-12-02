(function (tree) {

tree.Directive = function (name, value, nodes) {
    this.name = name;
    if (Array.isArray(value)) {
        this.ruleset = new(tree.Ruleset)([], value);
    } else {
        this.value = value;
    }
    this.nodes = (typeof(nodes) != 'undefined' ? nodes : null);
};
tree.Directive.prototype = {
    toCSS: function (ctx, env) {
        var node_css = '';
        if(this.nodes) {
            for(var i = 0; i < this.nodes.length; i++) {
                node_css += ' ' + this.nodes[i].toCSS(ctx, env) ;
            }
            /* Remove extra spaces in query synax so unit tests pass */
            node_css = node_css.replace(/\(\s+([^\s]+)\s+:\s+([^\s]+)\s\)/g,'($1:$2)');
        }
        if (this.ruleset) {
            this.ruleset.root = true;
            return this.name + node_css +(env.compress ? '{' : ' {\n  ') +
                   this.ruleset.toCSS(ctx, env).trim().replace(/\n/g, '\n  ') +
                               (env.compress ? '}': '\n}\n');
        } else {
            return this.name + node_css + ' ' + this.value.toCSS() + ';\n';
        }
    },
    eval: function (env) {
        if(this.nodes) {
            for(var i = 0; i < this.nodes.length; i++) {
                this.nodes[i] = this.nodes[i].eval(env);
            }
        }
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
