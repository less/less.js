(function (tree) {
    tree.joinSelectorVisitor = function() {
        this.context = [];
        this._visitor = new tree.visitor(this);
    };

    tree.joinSelectorVisitor.prototype = {
        run: function (root) {
            return this._visitor.visit(root);
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
            return ruleNode;
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
            return mixinDefinitionNode;
        },

        visitRuleset: function (rulesetNode, visitArgs) {

            return rulesetNode;
        },
        visitMedia: function (rulesetNode, visitArgs) {

            return rulesetNode;
        },
        visitDirective: function (rulesetNode, visitArgs) {

            return rulesetNode;
        }
    };

})(require('./tree'));