if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Ruleset = function Ruleset(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
    this._lookups = {};
};
tree.Ruleset.prototype = {
    eval: function () { return this },
    evalRules: function (context) {
        var rules = [];

        this.rules.forEach(function (rule) {
            if (rule.evalRules) {
                rules.push(rule.evalRules(context));
            } else if (rule instanceof tree.mixin.Call) {
                Array.prototype.push.apply(rules, rule.eval(context));
            } else {
                rules.push(rule.eval(context));
            }
        });
        this.rules = rules;
        return this;
    },
    variables: function () {
        if (this._variables) { return this._variables }
        else {
            return this._variables = this.rules.filter(function (r) {
                if (r instanceof tree.Rule && r.variable === true) { return r }
            });
        }
    },
    rulesets: function () {
        if (this._rulesets) { return this._rulesets }
        else {
            return this._rulesets = this.rules.filter(function (r) {
                if (r instanceof tree.Ruleset || r instanceof tree.mixin.Definition) { return r }
            });
        }
    },
    find: function (selector, self) {
        self = self || this;
        var rules = [], rule, match,
            key = selector.toCSS();

        if (key in this._lookups) { return this._lookups[key] }

        this.rulesets().forEach(function (rule) {
            if (rule !== self) {
                for (var j = 0; j < rule.selectors.length; j++) {
                    if (match = selector.match(rule.selectors[j])) {
                        if (selector.elements.length > 1) {
                            Array.prototype.push.apply(rules, rule.find(
                                new(tree.Selector)(selector.elements.slice(1)), self));
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
    //
    // Entry point for code generation
    //
    //     `context` holds an array of arrays.
    //
    toCSS: function (context, env) {
        var css = [],      // The CSS output
            rules = [],    // node.Rule instances
            rulesets = [], // node.Ruleset instances
            paths = [],    // Current selectors
            selector,      // The fully rendered selector
            rule;

        if (! this.root) {
            if (context.length === 0) {
                paths = this.selectors.map(function (s) { return [s] });
            } else {
                for (var s = 0; s < this.selectors.length; s++) {
                    for (var c = 0; c < context.length; c++) {
                        paths.push(context[c].concat([this.selectors[s]]));
                    }
                }
            }
        } else {
            context = [], env = { frames: [] }
            for (var i = 0; i < this.rules.length; i++) {
                if (this.rules[i] instanceof tree.Import) {
                    Array.prototype.splice
                         .apply(this.rules, [i, 1].concat(this.rules[i].eval(env)));
                }
            }
        }

        // push the current ruleset to the frames stack
        env.frames.unshift(this);

        // Evaluate mixins
        for (var i = 0; i < this.rules.length; i++) {
            if (this.rules[i] instanceof tree.mixin.Call) {
                Array.prototype.splice
                     .apply(this.rules, [i, 1].concat(this.rules[i].eval(env)));
            }
        }

        // Evaluate rules and rulesets
        for (var i = 0; i < this.rules.length; i++) {
            rule = this.rules[i];

            if (rule.rules) {
                rulesets.push(rule.toCSS(paths, env));
            } else if (rule instanceof tree.Comment) {
                if (this.root) {
                    rulesets.push(rule.toCSS());
                } else {
                    rules.push(rule.toCSS());
                }
            } else {
                if (rule.toCSS && !rule.variable) {
                    rules.push(rule.toCSS(env));
                } else if (rule.value && !rule.variable) {
                    rules.push(rule.value.toString());
                }
            }
        } 

        rulesets = rulesets.join('');

        // If this is the root node, we don't render
        // a selector, or {}.
        // Otherwise, only output if this ruleset has rules.
        if (this.root) {
            css.push(rules.join('\n'));
        } else {
            if (rules.length > 0) {
                selector = paths.map(function (p) {
                    return p.map(function (s) {
                        return s.toCSS();
                    }).join('').trim();
                }).join(paths.length > 3 ? ',\n' : ', ');
                css.push(selector, " {\n  " + rules.join('\n  ') + "\n}\n");
            }
        }
        css.push(rulesets);

        // Pop the stack
        env.frames.shift();
        paths.forEach(function (p) { p.pop() });

        return css.join('');
    }
};

