import contexts from '../contexts';
import Visitor from './visitor';
import ImportSequencer from './import-sequencer';
import * as utils from '../utils';

const ImportVisitor = function(importer, finish) {

    this._visitor = new Visitor(this);
    this._importer = importer;
    this._finish = finish;
    this.context = new contexts.Eval();
    this.importCount = 0;
    this.onceFileDetectionMap = {};
    this.recursionDetector = {};
    this._sequencer = new ImportSequencer(this._onSequencerEmpty.bind(this));
};

ImportVisitor.prototype = {
    isReplacing: false,
    run: function (root) {
        try {
            // process the contents
            this._visitor.visit(root);
        }
        catch (e) {
            this.error = e;
        }

        this.isFinished = true;
        this._sequencer.tryRun();
    },
    _onSequencerEmpty: function() {
        if (!this.isFinished) {
            return;
        }
        this._finish(this.error);
    },
    visitImport: function (importNode, visitArgs) {
        const inlineCSS = importNode.options.inline;

        if (!importNode.css || inlineCSS) {

            const context = new contexts.Eval(this.context, utils.copyArray(this.context.frames));
            const importParent = context.frames[0];

            this.importCount++;
            if (importNode.isVariableImport()) {
                this._sequencer.addVariableImport(this.processImportNode.bind(this, importNode, context, importParent));
            } else {
                this.processImportNode(importNode, context, importParent);
            }
        }
        visitArgs.visitDeeper = false;
    },
    processImportNode: function(importNode, context, importParent) {
        let evaldImportNode;
        const inlineCSS = importNode.options.inline;

        try {
            evaldImportNode = importNode.evalForImport(context);
        } catch (e) {
            if (!e.filename) { e.index = importNode.getIndex(); e.filename = importNode.fileInfo().filename; }
            // attempt to eval properly and treat as css
            importNode.css = true;
            // if that fails, this error will be thrown
            importNode.error = e;
        }

        if (evaldImportNode && (!evaldImportNode.css || inlineCSS)) {

            if (evaldImportNode.options.multiple) {
                context.importMultiple = true;
            }

            // try appending if we haven't determined if it is css or not
            const tryAppendLessExtension = evaldImportNode.css === undefined;

            for (let i = 0; i < importParent.rules.length; i++) {
                if (importParent.rules[i] === importNode) {
                    importParent.rules[i] = evaldImportNode;
                    break;
                }
            }

            const onImported = this.onImported.bind(this, evaldImportNode, context), sequencedOnImported = this._sequencer.addImport(onImported);

            this._importer.push(evaldImportNode.getPath(), tryAppendLessExtension, evaldImportNode.fileInfo(),
                evaldImportNode.options, sequencedOnImported);
        } else {
            this.importCount--;
            if (this.isFinished) {
                this._sequencer.tryRun();
            }
        }
    },
    onImported: function (importNode, context, e, root, importedAtRoot, fullPath) {
        if (e) {
            if (!e.filename) {
                e.index = importNode.getIndex(); e.filename = importNode.fileInfo().filename;
            }
            this.error = e;
        }

        const importVisitor = this,
            inlineCSS = importNode.options.inline,
            isPlugin = importNode.options.isPlugin,
            isOptional = importNode.options.optional,
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

        if (!fullPath && isOptional) {
            importNode.skip = true;
        }

        if (root) {
            importNode.root = root;
            importNode.importedFilename = fullPath;

            if (!inlineCSS && !isPlugin && (context.importMultiple || !duplicateImport)) {
                importVisitor.recursionDetector[fullPath] = true;

                const oldContext = this.context;
                this.context = context;
                try {
                    this._visitor.visit(root);
                } catch (e) {
                    this.error = e;
                }
                this.context = oldContext;
            }
        }

        importVisitor.importCount--;

        if (importVisitor.isFinished) {
            importVisitor._sequencer.tryRun();
        }
    },
    visitDeclaration: function (declNode, visitArgs) {
        if (declNode.value.type === 'DetachedRuleset') {
            this.context.frames.unshift(declNode);
        } else {
            visitArgs.visitDeeper = false;
        }
    },
    visitDeclarationOut: function(declNode) {
        if (declNode.value.type === 'DetachedRuleset') {
            this.context.frames.shift();
        }
    },
    visitAtRule: function (atRuleNode, _visitArgs) {
        this.context.frames.unshift(atRuleNode);
    },
    visitAtRuleOut: function (_atRuleNode) {
        this.context.frames.shift();
    },
    visitMixinDefinition: function (mixinDefinitionNode, _visitArgs) {
        this.context.frames.unshift(mixinDefinitionNode);
    },
    visitMixinDefinitionOut: function (_mixinDefinitionNode) {
        this.context.frames.shift();
    },
    visitRuleset: function (rulesetNode, _visitArgs) {
        this.context.frames.unshift(rulesetNode);
    },
    visitRulesetOut: function (_rulesetNode) {
        this.context.frames.shift();
    },
    visitMedia: function (mediaNode, _visitArgs) {
        this.context.frames.unshift(mediaNode.rules[0]);
    },
    visitMediaOut: function (_mediaNode) {
        this.context.frames.shift();
    }
};
export default ImportVisitor;
