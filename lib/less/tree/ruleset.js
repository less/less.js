(function (tree) {

tree.Ruleset = function (selectors, rules, strictImports) {
    this.selectors = selectors;
    this.rules = rules;
    this._lookups = {};
    this.strictImports = strictImports;
};
tree.Ruleset.prototype = {
    type: "Ruleset",
    accept: function (visitor) {
        this.selectors = visitor.visit(this.selectors);
        this.rules = visitor.visit(this.rules);
    },
    eval: function (env) {
        var selectors = this.selectors && this.selectors.map(function (s) { return s.eval(env) });
        var ruleset = new(tree.Ruleset)(selectors, this.rules.slice(0), this.strictImports);
        var rules;
        
        ruleset.originalRuleset = this;
        ruleset.root = this.root;
        ruleset.firstRoot = this.firstRoot;
        ruleset.allowImports = this.allowImports;

        if(this.debugInfo) {
            ruleset.debugInfo = this.debugInfo;
        }

        // push the current ruleset to the frames stack
        env.frames.unshift(ruleset);

        // currrent selectors
        if (!env.selectors) {
            env.selectors = [];
        }
        env.selectors.unshift(this.selectors);

        // Evaluate imports
        if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
            ruleset.evalImports(env);
        }

        // Store the frames around mixin definitions,
        // so they can be evaluated like closures when the time comes.
        for (var i = 0; i < ruleset.rules.length; i++) {
            if (ruleset.rules[i] instanceof tree.mixin.Definition) {
                ruleset.rules[i].frames = env.frames.slice(0);
            }
        }
        
        var mediaBlockCount = (env.mediaBlocks && env.mediaBlocks.length) || 0;

        // Evaluate mixin calls.
        for (var i = 0; i < ruleset.rules.length; i++) {
            if (ruleset.rules[i] instanceof tree.mixin.Call) {
                rules = ruleset.rules[i].eval(env).filter(function(r) {
                    if ((r instanceof tree.Rule) && r.variable) {
                        // do not pollute the scope if the variable is
                        // already there. consider returning false here
                        // but we need a way to "return" variable from mixins
                        return !(ruleset.variable(r.name));
                    }
                    return true;
                });
                ruleset.rules.splice.apply(ruleset.rules, [i, 1].concat(rules));
                i += rules.length-1;
                ruleset.resetCache();
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
        env.selectors.shift();
        
        if (env.mediaBlocks) {
            for(var i = mediaBlockCount; i < env.mediaBlocks.length; i++) {
                env.mediaBlocks[i].bubbleSelectors(selectors);
            }
        }

        return ruleset;
    },
    evalImports: function(env) {
        var i, rules;
        for (i = 0; i < this.rules.length; i++) {
            if (this.rules[i] instanceof tree.Import) {
                rules = this.rules[i].eval(env);
                if (typeof rules.length === "number") {
                    this.rules.splice.apply(this.rules, [i, 1].concat(rules));
                    i+= rules.length-1;
                } else {
                    this.rules.splice(i, 1, rules);
                }
                this.resetCache();
            }
        }
    },
    makeImportant: function() {
        return new tree.Ruleset(this.selectors, this.rules.map(function (r) {
                    if (r.makeImportant) {
                        return r.makeImportant();
                    } else {
                        return r;
                    }
                }), this.strictImports);
    },
    matchArgs: function (args) {
        return !args || args.length === 0;
    },
    matchCondition: function (args, env) {
        var lastSelector = this.selectors[this.selectors.length-1];
        if (lastSelector.condition &&
            !lastSelector.condition.eval(
                new(tree.evalEnv)(env,
                    env.frames))) {
            return false;
        }
        return true;
    },
    resetCache: function () {
        this._rulesets = null;
        this._variables = null;
        this._lookups = {};
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
        return this.rules.filter(function (r) {
            return (r instanceof tree.Ruleset) || (r instanceof tree.mixin.Definition);
        });
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
    genCSS: function (env, output) {
        output.add(this.toCSS(env));
    },
    //
    // Entry point for code generation
    //
    //     `context` holds an array of arrays.
    //
    toCSS: function (env) {
        var css = [],      // The CSS output
            rules = [],    // node.Rule instances
           _rules = [],    //
            rulesets = [], // node.Ruleset instances
            selector,      // The fully rendered selector
            debugInfo,     // Line number debugging
            rule,
            ruleCSS;

        this.mergeRules();

        env.tabLevel = (env.tabLevel || 0);

        if (!this.root) {
            env.tabLevel++;
        }

        // Compile rules and rulesets
        for (var i = 0; i < this.rules.length; i++) {
            rule = this.rules[i];

            if (rule.rules || (rule instanceof tree.Media) || rule instanceof tree.Directive) {
                rulesets.push(rule.toCSS(env));
            } else if (rule instanceof tree.Comment) {
                if (this.root) {
                    rulesets.push(rule.toCSS(env));
                } else {
                    rules.push(rule.toCSS(env));
                }
            } else {
                if (rule.toCSS) {
                    rules.push(rule.toCSS(env));
                } else if (rule.value) {
                    rules.push(rule.value.toString());
                }
            }
        }

        rules = rules.filter(function(rule) { return !!rule; });
        rulesets = rulesets.filter(function(rule) { return !!rule; });

        // Remove last semicolon
        if (env.compress && rules.length) {
            rule = rules[rules.length - 1];
            if (rule.charAt(rule.length - 1) === ';') {
                rules[rules.length - 1] = rule.substring(0, rule.length - 1);
            }
        }

        var tabRuleStr = env.compress ? '' : Array(env.tabLevel + 1).join("  "),
            tabSetStr = env.compress ? '' : Array(env.tabLevel).join("  ");

        rulesets = rulesets.join('\n' + (this.root ? tabRuleStr : tabSetStr));

        // If this is the root node, we don't render
        // a selector, or {}.
        // Otherwise, only output if this ruleset has rules.
        if (this.root) {
            if (rules.length > 0) {
                css.push(rules.join(env.compress ? '' : ('\n' + tabRuleStr))/* + '\n'*/);
            }
        } else {
            if (rules.length > 0) {
                debugInfo = tree.debugInfo(env, this, tabSetStr);
                selector = this.paths
                    .map(function (p) {
                        return p.map(function (s) {
                            return s.toCSS(env);
                        }).join('').trim();
                    }).join(env.compress ? ',' : (',\n' + tabSetStr));

                if (selector) {
                    // Remove duplicates
                    for (var i = rules.length - 1; i >= 0; i--) {
                        if (rules[i].slice(0, 2) === "/*" ||  _rules.indexOf(rules[i]) === -1) {
                            _rules.unshift(rules[i]);
                        }
                    }
                    rules = _rules;

                    if (debugInfo) {
                        css.push(debugInfo);
                        css.push(tabSetStr);
                    }

                    css.push(selector +
                            (env.compress ? '{' : ' {\n') + tabRuleStr +
                            rules.join(env.compress ? '' : ('\n' + tabRuleStr)) +
                            (env.compress ? '}' : '\n' + tabSetStr + '}'));
                }
            }
        }

        if (!this.root) {
            env.tabLevel--;
        }

        if (rules.length && rulesets.length) {
            css.push("\n" + (this.root ? tabRuleStr : tabSetStr));
        }

        css.push(rulesets);

        return css.join('') + (!env.compress && this.firstRoot ? '\n' : '');
    },

    toCSSRoot: function (env) {
    },

    markReferenced: function () {
        for (var s = 0; s < this.selectors.length; s++) {
            this.selectors[s].markReferenced();
        }
    },

    joinSelectors: function (paths, context, selectors) {
        for (var s = 0; s < selectors.length; s++) {
            this.joinSelector(paths, context, selectors[s]);
        }
    },

    joinSelector: function (paths, context, selector) {

        var i, j, k, 
            hasParentSelector, newSelectors, el, sel, parentSel, 
            newSelectorPath, afterParentJoin, newJoinedSelector, 
            newJoinedSelectorEmpty, lastSelector, currentElements,
            selectorsMultiplied;
    
        for (i = 0; i < selector.elements.length; i++) {
            el = selector.elements[i];
            if (el.value === '&') {
                hasParentSelector = true;
            }
        }
    
        if (!hasParentSelector) {
            if (context.length > 0) {
                for(i = 0; i < context.length; i++) {
                    paths.push(context[i].concat(selector));
                }
            }
            else {
                paths.push([selector]);
            }
            return;
        }

        // The paths are [[Selector]]
        // The first list is a list of comma seperated selectors
        // The inner list is a list of inheritance seperated selectors
        // e.g.
        // .a, .b {
        //   .c {
        //   }
        // }
        // == [[.a] [.c]] [[.b] [.c]]
        //

        // the elements from the current selector so far
        currentElements = [];
        // the current list of new selectors to add to the path.
        // We will build it up. We initiate it with one empty selector as we "multiply" the new selectors
        // by the parents
        newSelectors = [[]];

        for (i = 0; i < selector.elements.length; i++) {
            el = selector.elements[i];
            // non parent reference elements just get added
            if (el.value !== "&") {
                currentElements.push(el);
            } else {
                // the new list of selectors to add
                selectorsMultiplied = [];

                // merge the current list of non parent selector elements
                // on to the current list of selectors to add
                if (currentElements.length > 0) {
                    this.mergeElementsOnToSelectors(currentElements, newSelectors);
                }

                // loop through our current selectors
                for(j = 0; j < newSelectors.length; j++) {
                    sel = newSelectors[j];
                    // if we don't have any parent paths, the & might be in a mixin so that it can be used
                    // whether there are parents or not
                    if (context.length == 0) {
                        // the combinator used on el should now be applied to the next element instead so that
                        // it is not lost
                        if (sel.length > 0) {
                            sel[0].elements = sel[0].elements.slice(0);
                            sel[0].elements.push(new(tree.Element)(el.combinator, '', 0)); //new Element(el.Combinator,  ""));
                        }
                        selectorsMultiplied.push(sel);
                    }
                    else {
                        // and the parent selectors
                        for(k = 0; k < context.length; k++) {
                            parentSel = context[k];
                            // We need to put the current selectors
                            // then join the last selector's elements on to the parents selectors

                            // our new selector path
                            newSelectorPath = [];
                            // selectors from the parent after the join
                            afterParentJoin = [];
                            newJoinedSelectorEmpty = true;

                            //construct the joined selector - if & is the first thing this will be empty,
                            // if not newJoinedSelector will be the last set of elements in the selector
                            if (sel.length > 0) {
                                newSelectorPath = sel.slice(0);
                                lastSelector = newSelectorPath.pop();
                                newJoinedSelector = selector.createDerived(lastSelector.elements.slice(0));
                                newJoinedSelectorEmpty = false;
                            }
                            else {
                                newJoinedSelector = selector.createDerived([]);
                            }

                            //put together the parent selectors after the join
                            if (parentSel.length > 1) {
                                afterParentJoin = afterParentJoin.concat(parentSel.slice(1));
                            }

                            if (parentSel.length > 0) {
                                newJoinedSelectorEmpty = false;

                                // join the elements so far with the first part of the parent
                                newJoinedSelector.elements.push(new(tree.Element)(el.combinator, parentSel[0].elements[0].value, 0));
                                newJoinedSelector.elements = newJoinedSelector.elements.concat(parentSel[0].elements.slice(1));
                            }

                            if (!newJoinedSelectorEmpty) {
                                // now add the joined selector
                                newSelectorPath.push(newJoinedSelector);
                            }

                            // and the rest of the parent
                            newSelectorPath = newSelectorPath.concat(afterParentJoin);

                            // add that to our new set of selectors
                            selectorsMultiplied.push(newSelectorPath);
                        }
                    }
                }

                // our new selectors has been multiplied, so reset the state
                newSelectors = selectorsMultiplied;
                currentElements = [];
            }
        }

        // if we have any elements left over (e.g. .a& .b == .b)
        // add them on to all the current selectors
        if (currentElements.length > 0) {
            this.mergeElementsOnToSelectors(currentElements, newSelectors);
        }

        for(i = 0; i < newSelectors.length; i++) {
            if (newSelectors[i].length > 0) {
                paths.push(newSelectors[i]);
            }
        }
    },
    
    mergeElementsOnToSelectors: function(elements, selectors) {
        var i, sel, extendList;

        if (selectors.length == 0) {
            selectors.push([ new(tree.Selector)(elements) ]);
            return;
        }

        for(i = 0; i < selectors.length; i++) {
            sel = selectors[i];

            // if the previous thing in sel is a parent this needs to join on to it
            if (sel.length > 0) {
                sel[sel.length - 1] = sel[sel.length - 1].createDerived(sel[sel.length - 1].elements.concat(elements));
            }
            else {
                sel.push(new(tree.Selector)(elements));
            }
        }
    },

    mergeRules: function () {
        var groups = {},
            parts,
            rule,
            key;

        for (var i = 0; i < this.rules.length; i++) {
            rule = this.rules[i];

            if ((rule instanceof tree.Rule) && rule.merge) {
                key = [rule.name,
                       rule.important ? "!" : ""].join(",");

                if (!groups[key]) {
                    parts = groups[key] = [];
                } else {
                    this.rules.splice(i--, 1);
                }

                parts.push(rule);
            }
        }

        Object.keys(groups).map(function (k) {
            parts = groups[k];

            if (parts.length > 1) {
				rule = parts[0];
				
				rule.value = new (tree.Value)(parts.map(function (p) {
					return p.value;
				}));
            }
        });
    }
};
})(require('../tree'));
