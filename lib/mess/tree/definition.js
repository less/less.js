(function(tree) {

tree.Definition = function(selector, rules) {
    this.selector = selector;
    this.rules = rules;
};

/**
 * Return a copy of this ruleset with only
 * rules related to a specific symbolizer, but otherwise identical
 * selectors.
 *
 * NOTE: does not clone objects besides creating a new Ruleset.
 */
tree.Definition.prototype.filter_symbolizer = function(symbolizer) {
    return new(tree.Definition)(this.selector, 
        this.rules.filter(function(rule) {
            return rule.symbolizer == symbolizer;
        })
    );
};

tree.Definition.prototype.symbolizers = function() {
    return this.rules.map(function(rule) {
        return rule.symbolizer;
    });
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

})(require('mess/tree'));
