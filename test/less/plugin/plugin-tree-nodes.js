functions.addMultiple({

    "test-comment": function() {
        return new tree.Combinator(' ');
    },
    "test-directive": function(arg1, arg2) {
        return new tree.Directive(arg1.value, new tree.Anonymous(arg2.value));
    },
    "test-extend": function() {
        //TODO
    },
    "test-import": function() {
        //TODO
    },
    "test-media": function() {
        //TODO
    },
    "test-mixin-call": function() {
        //TODO
    },
    "test-mixin-definition": function() {
        //TODO
    },
    "test-ruleset-call": function() {
        return new tree.Combinator(' ');
    },
    // Functions must return something. Must 'return true' if they produce no output.
    "test-undefined": function() { },

    // These cause root errors
    "test-alpha": function() {
        return new tree.Alpha(30);
    },
    "test-assignment": function() {
        return new tree.Assignment("bird", "robin");
    },
    "test-attribute": function() {
        return new tree.Attribute("foo", "=", "bar");
    },
    "test-call": function() {
        return new tree.Call("foo");
    },
    "test-color": function() {
        return new tree.Color([50, 50, 50]);
    },
    "test-condition": function() {
        return new tree.Condition('<', new tree.Value([0]), new tree.Value([1]));
    },
    "test-detached-ruleset" : function() {
        var rule = new tree.Rule('prop', new tree.Anonymous('value'));
        return new tree.DetachedRuleset(new tree.Ruleset("", [ rule ]));
    },
    "test-dimension": function() {
        return new tree.Dimension(1, 'px');
    },
    "test-element": function() {
        return new tree.Element('+', 'a');
    },
    "test-expression": function() {
        return new tree.Expression([1, 2, 3]);
    },
    "test-keyword": function() {
        return new tree.Keyword('foo');
    },
    "test-operation": function() {
        return new tree.Operation('+', [1, 2]);
    },
    "test-quoted": function() {
        return new tree.Quoted('"', 'foo');
    },
    "test-selector": function() {
        return new tree.Selector([new tree.Element('a')]);
    },
    "test-url": function() {
        return new tree.URL('http://google.com');
    },
    "test-value": function() {
        return new tree.Value([1]);
    }
});