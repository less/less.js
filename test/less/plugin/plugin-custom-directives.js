
functions.addMultiple({
    "@make-directive" : function(name, value, rules) {
        return new tree.Directive('@' + value, new tree.Anonymous('success'));
    },
    "@eval-rules" : function(name, value, rules) {
        return new tree.Ruleset([ new tree.Selector([new tree.Element("", value)]) ], rules.rules);
    }
});
