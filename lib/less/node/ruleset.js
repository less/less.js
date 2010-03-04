if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Ruleset = function Ruleset(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
};
tree.Ruleset.prototype = {
    variables: function () {
        return this.rules.filter(function (r) {
            if (r instanceof tree.Rule && r.variable === true) { return r }
        });
    },
    mixable: function (fun) {
        return this.rules.filter(function (r) {
            if (r instanceof tree.mixin.Definition || r instanceof tree.Ruleset) { return r }
        });
    },
    find: function (selector) {
        return this.mixable().find(function (rule) {
            for (var j = 0; j < rule.selectors.length; j++) {
                if (selector.elements[0].value === rule.selectors[j].elements[0].value) {
                    if (selector.elements.length > 1) {
                        return rule.find(new(tree.Selector)(selector.elements.slice(1)));
                    } else {
                        return rule;
                    }
                }
            }
        });
    },
    //
    // Entry point for code generation
    //
    toCSS: function (context, env) {
        var css = [],      // The CSS output
            rules = [],    // node.Rule instances
            rulesets = [], // node.Ruleset instances
            paths = [],    // Current selectors
            selector;      // The fully rendered selector

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
        }
        env.frames.unshift(this);

        for (var i = 0; i < this.rules.length; i++) {
            if (this.rules[i] instanceof tree.mixin.Call) {
                Array.prototype.splice
                     .apply(this.rules, [i, 1].concat(this.rules[i].eval(env)));
            }
        }
        for (var i = 0; i < this.rules.length; i++) {
            if (this.rules[i] instanceof tree.Ruleset) {
                rulesets.push(this.rules[i].toCSS(paths, env));
            } else {
                if (this.rules[i].toCSS) {
                    rules.push(this.rules[i].toCSS(env));
                } else if (this.rules[i].value) {
                    rules.push(this.rules[i].value.toString());    
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
                    return new(tree.Selector)(p).toCSS().trim();
                }).join(paths.length > 3 ? ',\n' : ', ');
                css.push(selector, " {\n  " + rules.join('\n  ') + "\n}\n");
            }
        }
        css.push(rulesets);

        // Pop the stack
        env.frames.shift();
        for (var p = 0; p < paths.length; p++) { paths[p].pop() }

        return css.join('');
    }
};

