(function(tree) {

tree.Ruleset = function Ruleset(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
    // static cache of find() function
    this._lookups = {};
};
tree.Ruleset.prototype = {
    eval: function(env) {
        var ruleset = new tree.Ruleset(this.selectors, this.rules.slice(0));
        ruleset.root = this.root;

        // push the current ruleset to the frames stack
        env.frames.unshift(ruleset);

        // Evaluate imports
        if (ruleset.root) {
            for (var i = 0; i < ruleset.rules.length; i++) {
                if (ruleset.rules[i] instanceof tree.Import) {
                    Array.prototype.splice
                         .apply(ruleset.rules, [i, 1].concat(ruleset.rules[i].eval(env)));
                }
            }
        }

        // Store the frames around mixin definitions,
        // so they can be evaluated like closures when the time comes.
        for (var i = 0; i < ruleset.rules.length; i++) {
            if (ruleset.rules[i] instanceof tree.mixin.Definition) {
                ruleset.rules[i].frames = env.frames.slice(0);
            }
        }

        // Evaluate mixin calls.
        for (var i = 0; i < ruleset.rules.length; i++) {
            if (ruleset.rules[i] instanceof tree.mixin.Call) {
                Array.prototype.splice
                     .apply(ruleset.rules, [i, 1].concat(ruleset.rules[i].eval(env)));
            }
        }

        // Evaluate everything else
        for (var i = 0, rule; i < ruleset.rules.length; i++) {
            rule = ruleset.rules[i];

            if (! (rule instanceof tree.mixin.Definition)) {
                ruleset.rules[i] = rule.eval ? rule.eval(env) : rule;
            }
        }

        // Pop the stack
        env.frames.shift();

        return ruleset;
    },
    match: function(args) {
        return !args || args.length === 0;
    },
    variables: function() {
        if (this._variables) { return this._variables }
        else {
            return this._variables = this.rules.reduce(function(hash, r) {
                if (r instanceof tree.Rule && r.variable === true) {
                    hash[r.name] = r;
                }
                return hash;
            }, {});
        }
    },
    variable: function(name) {
        return this.variables()[name];
    },
    /**
     * Extend this rule by adding rules from another ruleset
     *
     * Currently this is designed to accept less specific
     * rules and add their values only if this ruleset doesn't
     * contain them.
     */

    rulesets: function() {
        if (this._rulesets) { return this._rulesets }
        else {
            return this._rulesets = this.rules.filter(function(r) {
                return (r instanceof tree.Ruleset) || (r instanceof tree.mixin.Definition);
            });
        }
    },
    find: function(selector, self) {
        self = self || this;
        var rules = [], rule, match,
            key = selector.toString();

        if (key in this._lookups) { return this._lookups[key] }

        this.rulesets().forEach(function(rule) {
            if (rule !== self) {
                for (var j = 0; j < rule.selectors.length; j++) {
                    if (match = selector.match(rule.selectors[j])) {
                        if (selector.elements.length > 1) {
                            Array.prototype.push.apply(rules, rule.find(
                                new tree.Selector(selector.elements.slice(1)), self));
                        } else {
                            rules.push(rule);
                        }
                        break;
                    }
                }
            }
        });
        return this._lookups[key] = rules;
    },
    flatten: function(result, parentSelectors, env) {
        var selectors = [];
        if (this.selectors.length == 0) {
            env.frames = env.frames.concat(this.rules);
        }
        for (var i = 0; i < this.selectors.length; i++) {
            var selector = this.selectors[i];

            if (parentSelectors.length) {
                for (var j = 0; j < parentSelectors.length; j++) {
                    var parent = parentSelectors[j];

                    // Create a new object for each so that we can have different
                    // elements and filters in the selector.
                    var instance = new tree.Selector();
                    instance.elements = parent.elements.concat(selector.elements);
                    instance.filters = parent.filters.concat(selector.filters);
                    instance.attachment = selector.attachment;
                    instance.index = selector.index;

                    selectors.push(instance);
                }
            }
            else {
                selectors.push(selector);
            }
        }

        var rules = [];
        for (var i = 0; i < this.rules.length; i++) {
            var rule = this.rules[i];

            if (rule instanceof tree.Ruleset) {
                rule.flatten(result, selectors, env);
            } else if (rule instanceof tree.Rule) {
                rules.push(rule);
            } else if (rule instanceof tree.Invalid) {
                env.errors.push(rule);
            }
        }

        for (var i = 0; i < selectors.length; i++) {
            result.push(new tree.Definition(selectors[i], rules));
        }

        return result;
    }
};
})(require('mess/tree'));
