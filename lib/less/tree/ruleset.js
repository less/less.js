(function (tree) {

tree.Ruleset = function (selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
    this._lookups = {};
};
tree.Ruleset.prototype = {
    eval: function (env) {
        var ruleset = new(tree.Ruleset)(this.selectors, this.rules.slice(0));

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
    match: function (args) {
        return !args || args.length === 0;
    },
    variables: function () {
        if (this._variables) { return this._variables }
        else {
            return this._variables = this.rules.reduce(function (hash, r) {
                if (r instanceof tree.Rule && r.variable === true) {
                    hash[r.name] = r;
                }
                return hash;
            }, {});
        }
    },
    variable: function (name) {
        return this.variables()[name];
    },
    rulesets: function () {
        if (this._rulesets) { return this._rulesets }
        else {
            return this._rulesets = this.rules.filter(function (r) {
                return (r instanceof tree.Ruleset) || (r instanceof tree.mixin.Definition);
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
                        if (selector.elements.length > rule.selectors[j].elements.length) {
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
                this.joinSelectors( paths, context, this.selectors );
            }
        }

        // Compile rules and rulesets
        for (var i = 0; i < this.rules.length; i++) {
            rule = this.rules[i];

            if (rule.rules || (rule instanceof tree.Directive)) {
                rulesets.push(rule.toCSS(paths, env));
            } else if (rule instanceof tree.Comment) {
                if (!rule.silent) {
                    if (this.root) {
                        rulesets.push(rule.toCSS(env));
                    } else {
                        rules.push(rule.toCSS(env));
                    }
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
            css.push(rules.join(env.compress ? '' : '\n'));
        } else {
            if (rules.length > 0) {
                selector = paths.map(function (p) {
                    return p.map(function (s) {
                        return s.toCSS(env);
                    }).join('').trim();
                }).join(env.compress ? ',' : (paths.length > 3 ? ',\n' : ', '));
                css.push(selector,
                        (env.compress ? '{' : ' {\n  ') +
                        rules.join(env.compress ? '' : '\n  ') +
                        (env.compress ? '}' : '\n}\n'));
            }
        }
        css.push(rulesets);

        return css.join('') + (env.compress ? '\n' : '');
    },

    joinSelectors: function (paths, context, selectors) {
        for (var s = 0; s < selectors.length; s++) {
            this.joinSelector(paths, context, selectors[s]);
        }
    },

    joinSelector: function (paths, context, selector) {
        var before = [], after = [], beforeElements = [],
            afterElements = [], hasParentSelector = false, el;

        for (var i = 0; i < selector.elements.length; i++) {
            el = selector.elements[i];
            if (el.combinator.value[0] === '&') {
                hasParentSelector = true;
            }
            if (hasParentSelector) afterElements.push(el);
            else                   beforeElements.push(el);
        }

        if (! hasParentSelector) {
            afterElements = beforeElements;
            beforeElements = [];
        }

        if (beforeElements.length > 0) {
            before.push(new(tree.Selector)(beforeElements));
        }

        if (afterElements.length > 0) {
            after.push(new(tree.Selector)(afterElements));
        }

        for (var c = 0; c < context.length; c++) {
            paths.push(before.concat(context[c]).concat(after));
        }
    }
};
})(require('less/tree'));
