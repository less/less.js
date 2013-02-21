(function (tree) {
    tree.importVisitor = function(root) {
        this._visitor = new tree.visitor(this);
        this._visitor.visit(root);
    };

    tree.importVisitor.prototype = {
        visitImport: function (importNode, visitArgs) {

            return importNode;
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
            return ruleNode;
        }
    };
})(require('./tree'));