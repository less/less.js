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
                    Array.prototype.push.apply(
                          rules, mixins[m].eval(this.arguments, env).rules);
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
    this.rules = rules;
    this._lookups = {};
};
tree.mixin.Definition.prototype = {
    toCSS: function () { return "" },
    variables: function () { return tree.Ruleset.prototype.variables.apply(this) },
    find: function () { return tree.Ruleset.prototype.find.apply(this, arguments) },
    rulesets: function () { return tree.Ruleset.prototype.rulesets.apply(this) },

    eval: function (args, env) {
        var frame = new(tree.Ruleset)(null, []), context;

        for (var i = 0, val; i < this.params.length; i++) {
            if (val = (args && args[i]) || this.params[i].value) {
                frame.rules.unshift(new(tree.Rule)(this.params[i].name, val));
            } else {
                throw new(Error)("wrong number of arguments for " + this.name);
            }
        }
        return new(tree.Ruleset)(null, this.rules).evalRules({
            frames: [this, frame].concat(env.frames)
        });
    }
};
