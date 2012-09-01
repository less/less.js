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
        var rules = [];
        
        ruleset.root = this.root;
        ruleset.allowImports = this.allowImports;

        // push the current ruleset to the frames stack
        env.frames.unshift(ruleset);

        // Evaluate imports
        if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
            for (var i = 0; i < ruleset.rules.length; i++) {
                if (ruleset.rules[i] instanceof tree.Import) {
                    rules = rules.concat(ruleset.rules[i].eval(env));
                } else {
                    rules.push(ruleset.rules[i]);
                }
            }
            ruleset.rules = rules;
            rules = [];
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
                rules = rules.concat(ruleset.rules[i].eval(env));
            } else {
                rules.push(ruleset.rules[i]);
            }
        }
        ruleset.rules = rules;

        // Evaluate everything else
        for (var i = 0, rule; i < ruleset.rules.length; i++) {
            rule = ruleset.rules[i];

            if (! (rule instanceof tree.mixin.Definition)) {
                ruleset.rules[i] = rule.eval ? rule.eval(env) : rule;
            }
        }

        // Pop the stack
        env.frames.shift();
        
        if (env.mediaBlocks) {
            for(var i = mediaBlockCount; i < env.mediaBlocks.length; i++) {
                env.mediaBlocks[i].bubbleSelectors(selectors);
            }
        }

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
            this.joinSelectors(paths, context, this.selectors);
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
                                newJoinedSelector = new(tree.Selector)(lastSelector.elements.slice(0));
                                newJoinedSelectorEmpty = false;
                            }
                            else {
                                newJoinedSelector = new(tree.Selector)([]);
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
            paths.push(newSelectors[i]);
        }
    },
    
    mergeElementsOnToSelectors: function(elements, selectors) {
        var i, sel;

        if (selectors.length == 0) {
            selectors.push([ new(tree.Selector)(elements) ]);
            return;
        }

        for(i = 0; i < selectors.length; i++) {
            sel = selectors[i];

            // if the previous thing in sel is a parent this needs to join on to it
            if (sel.length > 0) {
                sel[sel.length - 1] = new(tree.Selector)(sel[sel.length - 1].elements.concat(elements));
            }
            else {
                sel.push(new(tree.Selector)(elements));
            }
        }
    }
};
})(require('../tree'));
