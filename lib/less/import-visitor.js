(function (tree) {
    tree.importVisitor = function(root, importer) {
        this._visitor = new tree.visitor(this);
        this._importer = importer;
        this._visitor.visit(root);
    };

    tree.importVisitor.prototype = {
        visitImport: function (importNode, visitArgs) {
            if (!importNode.css) {
                this._importer.push(importNode.path, function (e, root, imported) {
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
        }
    };
})(require('./tree'));