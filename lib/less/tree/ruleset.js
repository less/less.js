(function (tree) {

tree.Ruleset = function (selectors, rules, strictImports) {
    this.selectors = selectors;
    this.rules = rules;
    this._lookups = {};
    this.strictImports = strictImports;
};
tree.Ruleset.prototype = {
    eval: function (env) {
        var selectors = this.selectors && this.selectors.map(function (s) { return s.eval(env) });
        var ruleset = new(tree.Ruleset)(selectors, this.rules.slice(0), this.strictImports);

        ruleset.root = this.root;
        ruleset.allowImports = this.allowImports;

        // push the current ruleset to the frames stack
        env.frames.unshift(ruleset);

        // Evaluate imports
        if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
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

        // Copy over (eventual) debug info to the generated CSS rule:
        // maintaining these informations after eval() is only required
        // by Rule and Ruleset
        if(this.dbg_filename) ruleset.dbg_filename = this.dbg_filename;
        if(this.dbg_lineno) ruleset.dbg_lineno = this.dbg_lineno;

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
           _rules = [],    //
            rulesets = [], // node.Ruleset instances
            paths = [],    // Current selectors
            selector,      // The fully rendered selector
            rule;

        if (! this.root) {
            if (context.length === 0) {
                paths = this.selectors.map(function (s) { return [s] });
            } else {
                this.joinSelectors(paths, context, this.selectors);
            }
        }

        // Compile rules and rulesets
        for (var i = 0; i < this.rules.length; i++) {
            rule = this.rules[i];

            if (rule.rules || (rule instanceof tree.Directive) || (rule instanceof tree.Media)) {
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
                }).join(env.compress ? ',' : ',\n');

                // Remove duplicates
                for (var i = rules.length - 1; i >= 0; i--) {
                    if (_rules.indexOf(rules[i]) === -1) {
                        _rules.unshift(rules[i]);
                    }
                }
                rules = _rules;

                css.push(selector,
                        (env.compress ? '{' : ' {\n  ') +
                        rules.join(env.compress ? '' : '\n  ') +
                        (env.compress ? '}' : '\n}\n'));
            }
        }
        css.push(rulesets);

        // Adds debug info if necessary
        return this.debugInfo(css.join('') + (env.compress ? '\n' : ''));
    },

    debugInfo: function(output) {
        // Generates debugging information in a manner similar to SASS.
        // This allows a Firebug extension to pick up these informations
        // and ease the development.

        // XXX: Currently we are not fully SASS compatible,
        // which requires to use a tailored Firebug plugin.
        // However, we do use the same prefix and the Firebug plugin
        // has only minor modifications.
        // Should be better to contact the SASS team
        // and try to make this more homogeneous.
        if((((typeof less) !== "undefined" && less.env === "development") ||
            (exports.env === "development")) &&
           this.selectors.length > 0 && this.rules.length > 0) {
            // Sometimes rulesets do not contain debug info,
            // therefore if it is missing we take it from the first rule
            // and we subtract one to the line number
            var lineno = this.dbg_lineno || this.rules[0].dbg_lineno;
            var filename = this.dbg_filename || this.rules[0].dbg_filename;
            if(lineno && filename) {
                if(!this.dbg_lineno) lineno--;
                var debug_info =
                    "@media -sass-debug-info{filename{font-family:"+
                    "\""+filename+"\""+
                    "}line{font-family:\""+lineno+"\";}}";
                return debug_info + "\n" + output;
            }
        }
        return output;
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
            if (el.combinator.value.charAt(0) === '&') {
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
})(require('../tree'));
