
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
    toCSS: function (path, env) {
        var css = [], rules = [], rulesets = [];

        if (! this.root) path.push(this.selectors.map(function (s) { return s.toCSS(env) }));
        env.frames.unshift(this);

        for (var i = 0; i < this.rules.length; i++) {
            if (this.rules[i] instanceof node.Ruleset) { continue }

            if (this.rules[i].toCSS) {
                rules.push(this.rules[i].toCSS(env));
            } else {
                if (this.rules[i].value) {
                    rules.push(this.rules[i].value.toString());    
                }
            }
        } 
        
        for (var i = 0; i < this.rules.length; i++) {
            if (! (this.rules[i] instanceof node.Ruleset)) { continue }
            rulesets.push(this.rules[i].toCSS(path, env));
        } 
        if (rules.length > 0) {
            if (path.length > 0) {
                css.push(path.join('').trim(),
                         " {\n  " + rules.join('\n  ') + "\n}\n",
                         rulesets.join(''));
            } else {
                css.push(rules.join('\n'), rulesets.join(''));
            }
        }
        path.pop();
        env.frames.shift();

        return css.join('');
    }
};

