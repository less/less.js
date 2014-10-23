var contexts = require("../contexts"),
    Visitor = require("./visitor"),
    ImportSequencer = require("./import-sequencer");

var ImportVisitor = function(importer, finish) {

    this._visitor = new Visitor(this);
    this._importer = importer;
    this._finish = finish;
    this.context = new contexts.Eval();
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
        var inlineCSS = importNode.options.inline;

        if (!importNode.css || inlineCSS) {

            // TODO - process this type of imports *last*
            //if (importNode.isVariableImport()) {
            //    console.log("variable import detected");
            //}
            importNode = this.processImportNode(importNode, this.context);
        }
        visitArgs.visitDeeper = false;
        return importNode;
    },
    processImportNode: function(importNode, currentContext) {
        var evaldImportNode,
            inlineCSS = importNode.options.inline;

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

                var oldContext = this.context;
                this.context = context;
                try {
                    this._visitor.visit(root);
                } catch (e) {
                    this.error = e;
                }
                this.context = oldContext;
            }
        }

        subFinish();
    },
    visitRule: function (ruleNode, visitArgs) {
        visitArgs.visitDeeper = false;
        return ruleNode;
    },
    visitDirective: function (directiveNode, visitArgs) {
        this.context.frames.unshift(directiveNode);
        return directiveNode;
    },
    visitDirectiveOut: function (directiveNode) {
        this.context.frames.shift();
    },
    visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
        this.context.frames.unshift(mixinDefinitionNode);
        return mixinDefinitionNode;
    },
    visitMixinDefinitionOut: function (mixinDefinitionNode) {
        this.context.frames.shift();
    },
    visitRuleset: function (rulesetNode, visitArgs) {
        this.context.frames.unshift(rulesetNode);
        return rulesetNode;
    },
    visitRulesetOut: function (rulesetNode) {
        this.context.frames.shift();
    },
    visitMedia: function (mediaNode, visitArgs) {
        this.context.frames.unshift(mediaNode.rules[0]);
        return mediaNode;
    },
    visitMediaOut: function (mediaNode) {
        this.context.frames.shift();
    }
};
module.exports = ImportVisitor;
