
node.Ruleset = function Ruleset(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
};
node.Ruleset.prototype = {
    variables: function () {
        return this.rules.filter(function (r) {
            if (r instanceof node.Rule && r.variable === true) { return r }
        });
    },
    toCSS: function (context, env) {
        var css = [],
            rules = [],
            rulesets = [],
            paths = [],
            selector;

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
            if (this.rules[i] instanceof node.Ruleset) {
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
        
        if (this.root) {
            css.push(rules.join('\n'));
        } else {
            if (rules.length > 0) {
                selector = paths.map(function (p) {
                    return new(node.Selector)(p).toCSS().trim();
                }).join(paths.length > 3 ? ',\n' : ', ');
                css.push(selector, " {\n  " + rules.join('\n  ') + "\n}\n");
            }
        }
        css.push(rulesets);
        env.frames.shift();

        for (var p = 0; p < paths.length; p++) { paths[p].pop() }

        return css.join('');
    }
};

