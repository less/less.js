RemoveProperty = function(less) {
    this._visitor = new less.visitors.Visitor(this);
};

RemoveProperty.prototype = {
    isReplacing: true,
    run: function (root) {
        return this._visitor.visit(root);
    },
    visitRule: function (ruleNode, visitArgs) {
        if (ruleNode.name != '-some-aribitrary-property')
        {
            return ruleNode;
        }
        else {
            return [];
        }
    }
};

var VisitorPlugin = {
    install: function(less, pluginManager) {
        pluginManager.addVisitor( new RemoveProperty(less));
    }
};

var less = {logLevel: 4,
    errorReporting: "console",
    plugins: [VisitorPlugin]};
