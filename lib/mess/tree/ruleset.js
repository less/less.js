(function(tree) {

tree.Ruleset = function(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
    // static cache of find() function
    this._lookups = {};
};
tree.Ruleset.prototype = {
    eval: function(env) {
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
     * Find a rule by name within this ruleset,
     * returning it if possible. Otherwise not returning.
     */
    findRule: function(name) {
        for (var i = 0; i < this.rules.length; i++) {
            if (this.rules[i].name == name) {
                return this.rules[i];
            }
        }
    },
    /**
     * Extend this rule by adding rules from another ruleset
     *
     * Currently this is designed to accept less specific
     * rules and add their values only if this ruleset doesn't
     * contain them.
     */
    extend: function(ruleset) {
        for (var i = 0; i < ruleset.rules.length; i++) {
            if (!this.findRule(ruleset.rules[i].name)) {
                this.rules.push(ruleset.rules[i]);
            }
        }
    },
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
            key = selector.toCSS();

        if (key in this._lookups) { return this._lookups[key] }

        this.rulesets().forEach(function(rule) {
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


    flatten: function(result, parentSelectors) {
        var selectors = [];
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
                    instance.label = 'label' in selector ? selector.label : parent.label;

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
                rule.flatten(result, selectors);
            }
            else {
                rule.value = rule.value.value[0];
                rules.push(rule);
            }
        }

        for (var i = 0; i < selectors.length; i++) {
            result.push(new tree.Definition(selectors[i], rules));
        }

        return result;
    },

        
    toMSS: function(env) {
        var rules = this.rules.map(function(rule) {
            rule.value = rule.value.value[0];
            console.log(rule);

            return rule.toCSS();
        });

        var styles = this.selectors.map(function(selector) {
            var filters = selector.filters.map(function(filter) {
                return filter.toCSS();
            });

            return '  <Style name="' + selector.toCSS() + '">\n' +
                    '    <Rule>\n' +
                    '        ' +
                          filters.join('\n        ') + '\n' +
                          rules.join('\n') +
                    '\n    </Rule>\n' +
                    '  </Style>\n';
        });

        return styles.join('');
    },

    //
    // Entry point for code generation
    //
    //     `context` holds an array of arrays.
    //
    //     context holds an array of arrays of
    //     rulesets that contain 'this' ruleset
    //
    toCSS: function(context, env) {
        var css = [],      // The CSS output
            rules = [],    // node.Rule instances
            rulesets = [], // node.Ruleset instances
            paths = [],    // Current selectors
            selector,      // The fully rendered selector
            symbolizers = {},
            rule;

        if (! this.root) {
            if (context.length === 0) {
                paths = this.selectors.map(function(s) { return [s] });
            } else {
                for (var s = 0; s < this.selectors.length; s++) {
                    for (var c = 0; c < context.length; c++) {
                        paths.push(context[c].concat([this.selectors[s]]));
                    }
                }
            }
        }

        // Compile rules and rulesets
        for (var i = 0, l = this.rules.length; i < l; i++) {
            rule = this.rules[i];

            // Recurse for rules that are rulesets
            if (rule.rules || (rule instanceof tree.Directive)) {
                rulesets.push(rule.toCSS(paths, env));
            // Rules that are actually comments
            } else if (rule instanceof tree.Comment) {
                if (!rule.silent) {
                    if (this.root) {
                        rulesets.push(rule.toCSS(env));
                    } else {
                        rules.push(rule.toCSS(env));
                    }
                }
            // Rules that are actually rules
            } else {
                if (rule.toCSS && !rule.variable) {
                    if (!symbolizers[rule.symbolizer]) {
                        symbolizers[rule.symbolizer] = {};
                    }
                    // creating symbolizers
                    symbolizers[rule.symbolizer][rule.name] = rule.toCSS(env);
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
                selector = paths.map(function(p) {
                    return p.map(function(s) {
                        return s.toCSS(env);
                    }).join('').trim();
                }).join((paths.length > 3 ? ',\n' : ', '));

                filters = (function(paths) {
                    var out = [];
                    paths.forEach(function(path) {
                        path.forEach(function(selector) {
                            selector.filters.forEach(function(filter) {
                                out.push(filter.toCSS());
                            });
                        });
                    });
                    return out;
                })(paths);

                if (symbolizers) {
                    rules = (function(symbolizers) {
                        var out = [];
                        for (i in symbolizers) {
                           var symname = i.charAt(0).toUpperCase()
                               + i.slice(1).replace(/\-./, function(str) {
                               return str[1].toUpperCase();
                           }) + 'Symbolizer';
                           // TODO: replace with _.values when underscore is included
                           sym = [];
                           prop_names = [];
                           for (j in symbolizers[i]) {
                               sym.push(symbolizers[i][j]);
                               prop_names.push(j);
                           }
                           if (err = tree.Reference.requiredProperties(i, prop_names)) {
                                throw { message: err };
                           }

                           out.push('      <' +
                               symname + ' ' +
                               sym.join('\n       ') +
                               '/>');
                        }
                        return out;
                    })(symbolizers);
                }
                if (this.selectors[0].elements[0].value !== 'Map') {
                      css.push('\n  <Style name="' +
                            selector +
                            '">\n    <Rule>\n      ' +
                            filters.join('\n') + '\n' +
                            rules.join('\n') +
                            '\n    </Rule>\n' +
                            '  </Style>\n');
                }
            }
        }
        css.push(rulesets);
        return css.join('');
    }
};
})(require('mess/tree'));
