(function (tree) {

tree.Directive = function (name, value, index, currentFileInfo) {
    this.name = name;

    if (Array.isArray(value)) {
        this.rules = [new(tree.Ruleset)([], value)];
        this.rules[0].allowImports = true;
    } else {
        this.value = value;
    }
    this.currentFileInfo = currentFileInfo;
};
tree.Directive.prototype = {
    type: "Directive",
    accept: function (visitor) {
        this.rules = visitor.visit(this.rules);
        this.value = visitor.visit(this.value);
    },
    toCSS: function (env) {

        if (this.currentFileInfo.reference && !this.isReferenced) {
            return "";
        }

        if (this.rules) {
            var css = "";
            for(var i = 0; i < this.rules.length; i++) {
                //this.rules[i].root = true;
                css += this.rules[i].toCSS(env).trim() + "\n";
            }
            css = css.trim().replace(/\n/g, '\n  ');
            return this.name + (env.compress ? '{' : ' {\n  ') + css + (env.compress ? '}': '\n}\n');
        } else {
            return this.name + ' ' + this.value.toCSS() + ';\n';
        }
    },
    eval: function (env) {
        var evaldDirective = this;
        if (this.rules) {
            env.frames.unshift(this);
            evaldDirective = new(tree.Directive)(this.name, null, this.index, this.currentFileInfo);
            evaldDirective.rules = [this.rules[0].eval(env)];
            evaldDirective.rules[0].root = true;
            env.frames.shift();
        }
        return evaldDirective;
    },
    variable: function (name) { return tree.Ruleset.prototype.variable.call(this.rules[0], name); },
    find: function () { return tree.Ruleset.prototype.find.apply(this.rules[0], arguments); },
    rulesets: function () { return tree.Ruleset.prototype.rulesets.apply(this.rules[0]); },
    markReferenced: function () {
        var i, rules;
        this.isReferenced = true;
        if (this.rules) {
            rules = this.rules[0].rules;
            for (i = 0; i < rules.length; i++) {
                if (rules[i].markReferenced) {
                    rules[i].markReferenced();
                }
            }
        }
    }
};

})(require('../tree'));
