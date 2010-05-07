if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.mixin = {};
tree.mixin.Call = function MixinCall(elements, args) {
    this.selector = new(tree.Selector)(elements);
    this.arguments = args;
};
tree.mixin.Call.prototype = {
    eval: function (env) {
        var mixins, rules = [];

        for (var i = 0; i < env.frames.length; i++) {
            if ((mixins = env.frames[i].find(this.selector)).length > 0) {
                for (var m = 0; m < mixins.length; m++) {
                    if (mixins[m].match(this.arguments, env)) {
                        Array.prototype.push.apply(
                              rules, mixins[m].eval(this.arguments, env).rules);
                    }
                }
                return rules;
            }
        }
        throw new(Error)(this.selector.toCSS().trim() + " is undefined");
    }
};

tree.mixin.Definition = function MixinDefinition(name, params, rules) {
    this.name = name;
    this.selectors = [new(tree.Selector)([new(tree.Element)(null, name)])];
    this.params = params;
    this.arity = params.length;
    this.rules = rules;
    this._lookups = {};
    this.required = params.reduce(function (count, p) {
        if (p.name && !p.value) { return count + 1 }
        else                    { return count }
    }, 0);
};
tree.mixin.Definition.prototype = {
    toCSS: function () { return "" },
    variable: function (name) { return tree.Ruleset.prototype.variable.call(this, name) },
    find: function () { return tree.Ruleset.prototype.find.apply(this, arguments) },
    rulesets: function () { return tree.Ruleset.prototype.rulesets.apply(this) },

    eval: function (args, env) {
        var frame = new(tree.Ruleset)(null, []), context;

        for (var i = 0, val; i < this.params.length; i++) {
            if (this.params[i].name) {
                if (val = (args && args[i]) || this.params[i].value) {
                    frame.rules.unshift(new(tree.Rule)(this.params[i].name, val.eval(env)));
                } else {
                    throw new(Error)("wrong number of arguments for " + this.name);
                }
            }
        }
        return new(tree.Ruleset)(null, this.rules).evalRules({
            frames: [this, frame].concat(env.frames)
        });
    },
    match: function (args, env) {
        var argsLength = (args && args.length) || 0;


        if (argsLength < this.required) {
            return false;
        }

        for (var i = 0; i < Math.min(argsLength, this.arity); i++) {
            if (!this.params[i].name) {
                if (args[i].wildcard) { continue }
                else if (args[i].toCSS(env) != this.params[i].value.toCSS(env)) {
                    return false;
                }
            }
        }
        return true;
    }
};
