var contexts = require("../contexts"),
    Visitor = require("./visitor"),
    ImportSequencer = require("./import-sequencer");

var ImportVisitor = function(importer, finish) {

    this._visitor = new Visitor(this);
    this._importer = importer;
    this._finish = finish;
    // TODO probably doesnt need to be an array
    this.contextStack = [new contexts.Eval()];
    this.importCount = 0;
    this.onceFileDetectionMap = {};
    this.recursionDetector = {};
    this._sequencer = new ImportSequencer();
};

ImportVisitor.prototype = {
    isReplacing: true,
    run: function (root) {
        var error;
        try {
            // process the contents
            this._visitor.visit(root);
        }
        catch(e) {
            error = e;
        }

        this.isFinished = true;
        if (this.importCount === 0) {
            this._finish(error || this.error);
        }
    },
    visitImport: function (importNode, visitArgs) {
        var evaldImportNode,
            inlineCSS = importNode.options.inline;

        if (!importNode.css || inlineCSS) {

            // TODO - process this type of imports *last*
            //if (importNode.isVariableImport()) {
            //    console.log("variable import detected");
            //}
            var currentContext = this.contextStack[this.contextStack.length - 1];

            try {
                evaldImportNode = importNode.evalForImport(currentContext);
            } catch(e){
                if (!e.filename) { e.index = importNode.index; e.filename = importNode.currentFileInfo.filename; }
                // attempt to eval properly and treat as css
                importNode.css = true;
                // if that fails, this error will be thrown
                importNode.error = e;
            }

            if (evaldImportNode && (!evaldImportNode.css || inlineCSS)) {
                importNode = evaldImportNode;
                this.importCount++;
                var context = new contexts.Eval(currentContext, currentContext.frames.slice(0));

                if (importNode.options.multiple) {
                    context.importMultiple = true;
                }

                // try appending if we haven't determined if it is css or not
                var tryAppendLessExtension = importNode.css === undefined;

                var onImported = this.onImported.bind(this, importNode, context),
                    sequencedOnImported = this._sequencer.addImport(onImported);

                this._importer.push(importNode.getPath(), tryAppendLessExtension, importNode.currentFileInfo, importNode.options, sequencedOnImported);
            }
        }
        visitArgs.visitDeeper = false;
        return importNode;
    },
    onImported: function (importNode, context, e, root, importedAtRoot, fullPath) {
        if (e && !e.filename) {
            e.index = importNode.index; e.filename = importNode.currentFileInfo.filename;
        }

        var importVisitor = this,
            inlineCSS = importNode.options.inline,
            duplicateImport = importedAtRoot || fullPath in importVisitor.recursionDetector;

        if (!context.importMultiple) {
            if (duplicateImport) {
                importNode.skip = true;
            } else {
                importNode.skip = function() {
                    if (fullPath in importVisitor.onceFileDetectionMap) {
                        return true;
                    }
                    importVisitor.onceFileDetectionMap[fullPath] = true;
                    return false;
                };
            }
        }

        var subFinish = function(e) {
            importVisitor.importCount--;

            if (importVisitor.importCount === 0 && importVisitor.isFinished) {
                importVisitor._finish(e || importVisitor.error);
            } else if (e) {
                importVisitor.error = e;
            }
        };

        if (root) {
            importNode.root = root;
            importNode.importedFilename = fullPath;

            if (!inlineCSS && (context.importMultiple || !duplicateImport)) {
                importVisitor.recursionDetector[fullPath] = true;

                this.contextStack.push(context);
                try {
                    this._visitor.visit(root);
                } catch (e) {
                    this.error = e;
                }
                this.contextStack.pop();
            }
        }

        subFinish();
    },
    visitRule: function (ruleNode, visitArgs) {
        visitArgs.visitDeeper = false;
        return ruleNode;
    },
    visitDirective: function (directiveNode, visitArgs) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.unshift(directiveNode);
        return directiveNode;
    },
    visitDirectiveOut: function (directiveNode) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.shift();
    },
    visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.unshift(mixinDefinitionNode);
        return mixinDefinitionNode;
    },
    visitMixinDefinitionOut: function (mixinDefinitionNode) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.shift();
    },
    visitRuleset: function (rulesetNode, visitArgs) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.unshift(rulesetNode);
        return rulesetNode;
    },
    visitRulesetOut: function (rulesetNode) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.shift();
    },
    visitMedia: function (mediaNode, visitArgs) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.unshift(mediaNode.rules[0]);
        return mediaNode;
    },
    visitMediaOut: function (mediaNode) {
        var currentContext = this.contextStack[this.contextStack.length - 1];
        currentContext.frames.shift();
    }
};
module.exports = ImportVisitor;
