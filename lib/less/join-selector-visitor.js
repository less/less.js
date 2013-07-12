(function (tree) {
    tree.joinSelectorVisitor = function() {
        this.contexts = [[]];
        this._visitor = new tree.visitor(this);
    };

    tree.joinSelectorVisitor.prototype = {
        run: function (root) {
            return this._visitor.visit(root);
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },

        visitRuleset: function (rulesetNode, visitArgs) {
            var context = this.contexts[this.contexts.length - 1];
            var paths = [];
            this.contexts.push(paths);

            if (! rulesetNode.root) {
                rulesetNode.selectors = rulesetNode.selectors.filter(function(selector) { return selector.getIsOutput(); });
                if (rulesetNode.selectors.length === 0) {
                    rulesetNode.rules.length = 0;
                }
                rulesetNode.joinSelectors(paths, context, rulesetNode.selectors);
                rulesetNode.paths = paths;
            }
        },
        visitRulesetOut: function (rulesetNode) {
            this.contexts.length = this.contexts.length - 1;
        },
        visitMedia: function (mediaNode, visitArgs) {
            var context = this.contexts[this.contexts.length - 1];
            mediaNode.rules[0].root = (context.length === 0 || context[0].multiMedia);
        }
    };

})(require('./tree'));