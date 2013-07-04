(function (tree) {
    tree.toCSSVisitor = function() {
        this._visitor = new tree.visitor(this);
    };

    tree.toCSSVisitor.prototype = {
        isReplacing: true,
        run: function (root) {
            return this._visitor.visit(root);
        },

        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
            return ruleNode;
        },

        visitDirective: function(directiveNode, visitArgs) {
            if (directiveNode.name === "@charset") {
                // Only output the debug info together with subsequent @charset definitions
                // a comment (or @media statement) before the actual @charset directive would
                // be considered illegal css as it has to be on the first line
                if (this.charset) {
                    if (directiveNode.debugInfo) {
                        var comment = new tree.Comment("/* " + directiveNode.toCSS({}).replace(/\n/g, "")+" */\n");
                        comment.debugInfo = directiveNode.debugInfo;
                        return this._visitor.visit(comment);
                    }
                    return [];
                }
                this.charset = true;
            }
            return directiveNode;
        },

        visitRuleset: function (rulesetNode, visitArgs) {
            var rule, rulesets = [];
            if (! rulesetNode.root) {
                // Compile rules and rulesets
                for (var i = 0; i < rulesetNode.rules.length; i++) {
                    rule = rulesetNode.rules[i];

                    if (rule.rules) {
                        rulesets.push(this._visitor.visit(rule));
                        rulesetNode.rules.splice(i, 1);
                        i--;
                        continue;
                    }
                }
                if (rulesets.length > 0 && rulesetNode.rules.length > 0) {
                    rulesets.splice(0, 0, rulesetNode);
                }
            }
            if (rulesets.length === 0) {
                rulesets = rulesetNode;
            }
            return rulesets;
        }
    };

})(require('./tree'));