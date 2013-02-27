(function (tree) {
    tree.importVisitor = function(root, importer) {
        this._visitor = new tree.visitor(this);
        this._importer = importer;
        this.env = new tree.evalEnv();

        // process the contents
        this._visitor.visit(root);
    };

    tree.importVisitor.prototype = {
        visitImport: function (importNode, visitArgs) {
            if (!importNode.css) {
                importNode = importNode.evalForImport(this.env);
                this._importer.push(importNode.getPath(), function (e, root, imported) {
                    if (e) { e.index = importNode.index; }
                    if (imported && importNode.once) { importNode.skip = imported; }
                    importNode.root = root || new(tree.Ruleset)([], []);
                });
            }
            visitArgs.visitDeeper = false;
            return importNode;
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
            return ruleNode;
        },
        visitDirective: function (directiveNode, visitArgs) {
            this.env.frames.unshift(directiveNode);
            return directiveNode;
        },
        visitDirectiveOut: function (directiveNode) {
            this.env.frames.shift();
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
            this.env.frames.unshift(mixinDefinitionNode);
            return mixinDefinitionNode;
        },
        visitMixinDefinitionOut: function (mixinDefinitionNode) {
            this.env.frames.shift();
        },
        visitRulesetDefinition: function (rulesetNode, visitArgs) {
            this.env.frames.unshift(rulesetNode);
            return rulesetNode;
        },
        visitRulesetDefinitionOut: function (rulesetNode) {
            this.env.frames.shift();
        },
        visitMedia: function (mediaNode, visitArgs) {
            this.env.frames.unshift(mediaNode.ruleset);
            return mediaNode;
        },
        visitMediaOut: function (mediaNode) {
            this.env.frames.shift();
        }
    };

})(require('./tree'));