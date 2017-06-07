functions.addMultiple({

    "test-comment": function() {
        return less.Combinator(' ');
    },
    "test-atrule": function(arg1, arg2) {
        return less.AtRule(arg1.value, arg2.value);
    },
    "test-extend": function() {
        // TODO
    },
    "test-import": function() {
        // TODO
    },
    "test-media": function() {
        // TODO
    },
    "test-mixin-call": function() {
        // TODO
    },
    "test-mixin-definition": function() {
        // TODO
    },
    "test-ruleset-call": function() {
        return less.Combinator(' ');
    },
    // Functions must return something, even if it's false/true
    "test-undefined": function() { 
        return;
    },
    "test-collapse": function() { 
        return true;
    },
    // These cause root errors
    "test-assignment": function() {
        return less.Assignment("bird", "robin");
    },
    "test-attribute": function() {
        return less.Attribute("foo", "=", "bar");
    },
    "test-call": function() {
        return less.Call("foo");
    },
    "test-color": function() {
        return less.Color([50, 50, 50]);
    },
    "test-condition": function() {
        return less.Condition('<', less.Value([0]), less.Value([1]));
    },
    "test-detached-ruleset" : function() {
        var decl = less.Declaration('prop', 'value');
        return less.DetachedRuleset(less.Ruleset("", [ decl ]));
    },
    "test-dimension": function() {
        return less.Dimension(1, 'px');
    },
    "test-element": function() {
        return less.Element('+', 'a');
    },
    "test-expression": function() {
        return less.Expression([1, 2, 3]);
    },
    "test-keyword": function() {
        return less.Keyword('foo');
    },
    "test-operation": function() {
        return less.Operation('+', [1, 2]);
    },
    "test-quoted": function() {
        return less.Quoted('"', 'foo');
    },
    "test-selector": function() {
        var sel = less.Selector('.a.b');
        return sel;
    },
    "test-url": function() {
        return less.URL('http://google.com');
    },
    "test-value": function() {
        return less.Value([1]);
    }
});