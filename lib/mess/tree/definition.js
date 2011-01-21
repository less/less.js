(function(tree) {

tree.Definition = function(selector, rules) {
    this.selector = selector;
    this.rules = rules;
};

tree.Definition.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.selector = this.selector.clone();
    obj.rules = this.rules.slice();
    return obj;
};

/**
 * Return a copy of this ruleset with only
 * rules related to a specific symbolizer, but otherwise identical
 * selectors.
 *
 * NOTE: does not clone objects besides creating a new Ruleset.
 */
tree.Definition.prototype.filter_symbolizer = function(symbolizer) {
    return new tree.Definition(this.selector, 
        this.rules.filter(function(rule) {
            return rule.symbolizer == symbolizer;
        })
    );
};

tree.Definition.prototype.symbolizers = function() {
    // reduce used to make the result of this 
    // an array of unique values.
    return this.rules.reduce(function(memo, rule) {
        if (memo.indexOf(rule.symbolizer) == -1) {
            memo.push(rule.symbolizer);
        }
        return memo;
    }, []);
};

/**
 * Find a rule by name within this ruleset,
 * returning it if possible. Otherwise not returning.
 */
tree.Definition.prototype.hasRule = function(name) {
    return this.rules.some(function(rule) {
        return rule.name == name;
    });
};

tree.Definition.prototype.inherit_from = function(definition) {
    for (var i = 0; i < definition.rules.length; i++) {
        if (!this.hasRule(definition.rules[i].name)) {
            this.rules.push(definition.rules[i]);
        }
    }
};

tree.Definition.prototype.unique_rules = function() {
    var rules = {},
        uniques = [];
    for (var i = this.rules.length - 1; i > -1; i--) {
        if (!rules[this.rules[i].name]) {
            uniques.push(this.rules[i]);
            rules[this.rules[i].name] = true;
        }
    }
    return uniques;
};

tree.Definition.prototype.toXML = function(env) {
    if (this._css) return this._css;
    var sym = this.symbolizers();
    if (sym.length !== 1) {
        throw {
            message: 'A single symbolizer is expected'
            + 'in definition compilation'
        }
    } else {
        sym = sym[0];
    }

    var symname = sym.charAt(0).toUpperCase()
        + sym.slice(1).replace(/\-./, function(str) {
        return str[1].toUpperCase();
    }) + 'Symbolizer';

    var rules = '    <'
        + symname
        + ' '
        + this.unique_rules().map(function(rule) {
            if (rule.eval) rule = rule.eval(env);
            return rule.toCSS();
        }).join('\n      ')
        + '/>';
    
    var filters = this.selector.combinedFilter();

    
    return this._css = '  <Rule>\n    ' +
        filters + '\n' +
        rules +
        '\n  </Rule>';
};

})(require('mess/tree'));
