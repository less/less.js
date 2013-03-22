(function (tree) {

tree.Directive = function (name, value, index, currentFileInfo) {
    this.name = name;

    if (Array.isArray(value)) {
        this.ruleset = new(tree.Ruleset)([], value);
        this.ruleset.allowImports = true;
    } else {
        this.value = value;
    }
    this.currentFileInfo = currentFileInfo;
};
tree.Directive.prototype = {
    type: "Directive",
    accept: function (visitor) {
        this.ruleset = visitor.visit(this.ruleset);
        this.value = visitor.visit(this.value);
    },
    toCSS: function (env) {

        if (this.currentFileInfo.mute && !this.isNotMute) {
            return "";
        }

        if (this.ruleset) {
            this.ruleset.root = true;
            return this.name + (env.compress ? '{' : ' {\n  ') +
                   this.ruleset.toCSS(env).trim().replace(/\n/g, '\n  ') +
                               (env.compress ? '}': '\n}\n');
        } else {
            return this.name + ' ' + this.value.toCSS() + ';\n';
        }
    },
    eval: function (env) {
        var evaldDirective = this;
        if (this.ruleset) {
            env.frames.unshift(this);
            evaldDirective = new(tree.Directive)(this.name, null, this.index, this.currentFileInfo);
            evaldDirective.ruleset = this.ruleset.eval(env);
            env.frames.shift();
        }
        return evaldDirective;
    },
    variable: function (name) { return tree.Ruleset.prototype.variable.call(this.ruleset, name) },
    find: function () { return tree.Ruleset.prototype.find.apply(this.ruleset, arguments) },
    rulesets: function () { return tree.Ruleset.prototype.rulesets.apply(this.ruleset) },
    markNotMute: function () {
        var rule, i;
        this.isNotMute = true;
        if (this.ruleset) {
            for (i = 0; i < this.ruleset.rules.length; i++) {
                rule = this.ruleset.rules[i];
                if (rule.markNotMute) {
                    rule.markNotMute();
                }
            }
        }
    }
};

})(require('../tree'));
