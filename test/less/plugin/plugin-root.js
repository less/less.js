functions.addMultiple({
    "test-detached-ruleset" : function() {
        var rule = new tree.Rule('prop', new tree.Anonymous('value'));
        return new tree.DetachedRuleset(new tree.Ruleset("", [ rule ]));
    },
    "test-directive": function(arg1, arg2) {
        return new tree.Directive(arg1.value, new tree.Anonymous('"' + arg2.value + '"'));
    },
    // Functions must return something. Must 'return true' if they produce no output.
    "test-undefined": function() { }
});