import Node from './node';
import Media from './media';
import URL from './url';
import Quoted from './quoted';
import Ruleset from './ruleset';
import Anonymous from './anonymous';
import * as utils from '../utils';
import LessError from '../less-error';
import Expression from './expression';

//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//
const Import = function(path, features, options, index, currentFileInfo, visibilityInfo) {
    this.options = options;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.path = path;
    this.features = features;
    this.allowRoot = true;

    if (this.options.less !== undefined || this.options.inline) {
        this.css = !this.options.less || this.options.inline;
    } else {
        const pathValue = this.getPath();
        if (pathValue && /[#.&?]css([?;].*)?$/.test(pathValue)) {
            this.css = true;
        }
    }
    this.copyVisibilityInfo(visibilityInfo);
    this.setParent(this.features, this);
    this.setParent(this.path, this);
};

Import.prototype = Object.assign(new Node(), {
    type: 'Import',

    accept(visitor) {
        if (this.features) {
            this.features = visitor.visit(this.features);
        }
        this.path = visitor.visit(this.path);
        if (!this.options.isPlugin && !this.options.inline && this.root) {
            this.root = visitor.visit(this.root);
        }
    },

    genCSS(context, output) {
        if (this.css && this.path._fileInfo.reference === undefined) {
            output.add('@import ', this._fileInfo, this._index);
            this.path.genCSS(context, output);
            if (this.features) {
                output.add(' ');
                this.features.genCSS(context, output);
            }
            output.add(';');
        }
    },

    getPath() {
        return (this.path instanceof URL) ?
            this.path.value.value : this.path.value;
    },

    isVariableImport() {
        let path = this.path;
        if (path instanceof URL) {
            path = path.value;
        }
        if (path instanceof Quoted) {
            return path.containsVariables();
        }

        return true;
    },

    evalForImport(context) {
        let path = this.path;

        if (path instanceof URL) {
            path = path.value;
        }

        return new Import(path.eval(context), this.features, this.options, this._index, this._fileInfo, this.visibilityInfo());
    },

    evalPath(context) {
        const path = this.path.eval(context);
        const fileInfo = this._fileInfo;

        if (!(path instanceof URL)) {
            // Add the rootpath if the URL requires a rewrite
            const pathValue = path.value;
            if (fileInfo &&
                pathValue &&
                context.pathRequiresRewrite(pathValue)) {
                path.value = context.rewritePath(pathValue, fileInfo.rootpath);
            } else {
                path.value = context.normalizePath(path.value);
            }
        }

        return path;
    },

    eval(context) {
        const result = this.doEval(context);
        if (this.options.reference || this.blocksVisibility()) {
            if (result.length || result.length === 0) {
                result.forEach(function (node) {
                    node.addVisibilityBlock();
                }
                );
            } else {
                result.addVisibilityBlock();
            }
        }
        return result;
    },

    doEval(context) {
        let ruleset;
        let registry;
        const features = this.features && this.features.eval(context);

        if (this.options.isPlugin) {
            if (this.root && this.root.eval) {
                try {
                    this.root.eval(context);
                }
                catch (e) {
                    e.message = 'Plugin error during evaluation';
                    throw new LessError(e, this.root.imports, this.root.filename);
                }
            }
            registry = context.frames[0] && context.frames[0].functionRegistry;
            if ( registry && this.root && this.root.functions ) {
                registry.addMultiple( this.root.functions );
            }

            return [];
        }

        if (this.skip) {
            if (typeof this.skip === 'function') {
                this.skip = this.skip();
            }
            if (this.skip) {
                return [];
            }
        }
        if (this.features) {
            let featureValue = this.features.value;
            if (Array.isArray(featureValue) && featureValue.length === 1) {
                const expr = featureValue[0];
                if (expr.type === 'Expression' && Array.isArray(expr.value) && expr.value.length >= 2) {
                    featureValue = expr.value;
                    const isLayer = featureValue[0].type === 'Keyword' && featureValue[0].value === 'layer'
                        && featureValue[1].type === 'Paren';
                    if (isLayer) {
                        this.css = false;
                    }
                }
            }
        }
        if (this.options.inline) {
            const contents = new Anonymous(this.root, 0,
                {
                    filename: this.importedFilename,
                    reference: this.path._fileInfo && this.path._fileInfo.reference
                }, true, true);

            return this.features ? new Media([contents], this.features.value) : [contents];
        } else if (this.css || this.layerCss) {
            const newImport = new Import(this.evalPath(context), features, this.options, this._index);
            if (this.layerCss) {
                newImport.css = this.layerCss;
                newImport.path._fileInfo = this._fileInfo;
            }
            if (!newImport.css && this.error) {
                throw this.error;
            }
            return newImport;
        } else if (this.root) {
            if (this.features) {
                let featureValue = this.features.value;
                if (Array.isArray(featureValue) && featureValue.length === 1) {
                    const expr = featureValue[0];
                    if (expr.type === 'Expression' && Array.isArray(expr.value) && expr.value.length >= 2) {
                        featureValue = expr.value;
                        const isLayer = featureValue[0].type === 'Keyword' && featureValue[0].value === 'layer'
                            && featureValue[1].type === 'Paren';
                        if (isLayer) {
                            this.layerCss = true;
                            // expr.noSpacing = true;
                            featureValue[0] = new Expression(featureValue.slice(0, 2));
                            featureValue.splice(1, 1);
                            featureValue[0].noSpacing = true;
                            return this;
                        }
                    }
                }
            }
            ruleset = new Ruleset(null, utils.copyArray(this.root.rules));
            ruleset.evalImports(context);

            return this.features ? new Media(ruleset.rules, this.features.value) : ruleset.rules;
        } else {
            if (this.features) {
                let featureValue = this.features.value;
                if (Array.isArray(featureValue) && featureValue.length >= 1) {
                    featureValue = featureValue[0].value;
                    if (Array.isArray(featureValue) && featureValue.length >= 2) {
                        const isLayer = featureValue[0].type === 'Keyword' && featureValue[0].value === 'layer'
                            && featureValue[1].type === 'Paren';
                        if (isLayer) {
                            this.css = true;
                            featureValue[0] = new Expression(featureValue.slice(0, 2));
                            featureValue.splice(1, 1);
                            featureValue[0].noSpacing = true;
                            return this;
                        }
                    }
                }
            }
            return [];
        }
    }
});

export default Import;
