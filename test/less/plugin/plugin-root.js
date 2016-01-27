functions.addMultiple({
    "test-detached-ruleset" : function() {
        var rule = new tree.Rule('prop', new tree.Anonymous('value'));
        return new tree.DetachedRuleset(new tree.Ruleset("", [ rule ]));
    },
    "test-directive": function() {
        return new tree.Directive("@charset", new tree.Anonymous('"utf-8"'));
    },
    // Functions must return something. Must 'return true' if they produce no output.
    "test-undefined": function() { }
});