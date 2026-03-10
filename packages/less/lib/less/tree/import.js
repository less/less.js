// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor, FileInfo, VisibilityInfo } from './node.js' */
import Node from './node.js';
import Media from './media.js';
import URL from './url.js';
import Quoted from './quoted.js';
import Ruleset from './ruleset.js';
import Anonymous from './anonymous.js';
import Expression from './expression.js';
import * as utils from '../utils.js';
import LessError from '../less-error.js';

/**
 * @typedef {object} ImportOptions
 * @property {boolean} [less]
 * @property {boolean} [inline]
 * @property {boolean} [isPlugin]
 * @property {boolean} [reference]
 */

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
class Import extends Node {
    get type() { return 'Import'; }

    /**
     * @param {Node} path
     * @param {Node | null} features
     * @param {ImportOptions} options
     * @param {number} index
     * @param {FileInfo} [currentFileInfo]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(path, features, options, index, currentFileInfo, visibilityInfo) {
        super();
        /** @type {ImportOptions} */
        this.options = options;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.path = path;
        /** @type {Node | null} */
        this.features = features;
        /** @type {boolean} */
        this.allowRoot = true;

        /** @type {boolean | undefined} */
        this.css = undefined;
        /** @type {boolean | undefined} */
        this.layerCss = undefined;
        /** @type {(Ruleset & { imports?: object, filename?: string, functions?: object, functionRegistry?: { addMultiple: (fns: object) => void } }) | undefined} */
        this.root = undefined;
        /** @type {string | undefined} */
        this.importedFilename = undefined;
        /** @type {boolean | (() => boolean) | undefined} */
        this.skip = undefined;
        /** @type {{ message: string, index: number, filename: string } | undefined} */
        this.error = undefined;

        if (this.options.less !== undefined || this.options.inline) {
            this.css = !this.options.less || this.options.inline;
        } else {
            const pathValue = this.getPath();
            if (pathValue && /[#.&?]css([?;].*)?$/.test(pathValue)) {
                this.css = true;
            }
        }
        this.copyVisibilityInfo(visibilityInfo);
        if (this.features) {
            this.setParent(this.features, /** @type {Node} */ (this));
        }
        this.setParent(this.path, /** @type {Node} */ (this));
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        if (this.features) {
            this.features = visitor.visit(this.features);
        }
        this.path = visitor.visit(this.path);
        if (!this.options.isPlugin && !this.options.inline && this.root) {
            this.root = /** @type {Ruleset} */ (visitor.visit(this.root));
        }
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
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
    }

    /** @returns {string | undefined} */
    getPath() {
        return (this.path instanceof URL) ?
            /** @type {string} */ (/** @type {Node} */ (this.path.value).value) :
            /** @type {string | undefined} */ (this.path.value);
    }

    /** @returns {boolean | RegExpMatchArray | null} */
    isVariableImport() {
        let path = this.path;
        if (path instanceof URL) {
            path = /** @type {Node} */ (path.value);
        }
        if (path instanceof Quoted) {
            return path.containsVariables();
        }

        return true;
    }

    /** @param {EvalContext} context */
    evalForImport(context) {
        let path = this.path;

        if (path instanceof URL) {
            path = /** @type {Node} */ (path.value);
        }

        return new Import(path.eval(context), this.features, this.options, this._index || 0, this._fileInfo, this.visibilityInfo());
    }

    /** @param {EvalContext} context */
    evalPath(context) {
        const path = this.path.eval(context);
        const fileInfo = this._fileInfo;

        if (!(path instanceof URL)) {
            // Add the rootpath if the URL requires a rewrite
            const pathValue = /** @type {string} */ (path.value);
            if (fileInfo &&
                pathValue &&
                context.pathRequiresRewrite(pathValue)) {
                path.value = context.rewritePath(pathValue, fileInfo.rootpath);
            } else {
                path.value = context.normalizePath(/** @type {string} */ (path.value));
            }
        }

        return path;
    }

    /** @param {EvalContext} context */
    // @ts-ignore - Import.eval returns Node | Node[] | Import (wider than Node.eval's Node return)
    eval(context) {
        const result = this.doEval(context);
        if (this.options.reference || this.blocksVisibility()) {
            if (Array.isArray(result)) {
                result.forEach(function (node) {
                    node.addVisibilityBlock();
                });
            } else {
                /** @type {Node} */ (result).addVisibilityBlock();
            }
        }
        return result;
    }

    /** @param {EvalContext} context */
    doEval(context) {
        /** @type {Ruleset | undefined} */
        let ruleset;
        const features = this.features && this.features.eval(context);

        if (this.options.isPlugin) {
            if (this.root && this.root.eval) {
                try {
                    this.root.eval(context);
                }
                catch (e) {
                    const err = /** @type {{ message: string }} */ (e);
                    err.message = 'Plugin error during evaluation';
                    throw new LessError(
                        /** @type {{ message: string, index?: number, filename?: string }} */ (e),
                        /** @type {{ imports: object }} */ (/** @type {unknown} */ (this.root)).imports,
                        /** @type {{ filename: string }} */ (/** @type {unknown} */ (this.root)).filename
                    );
                }
            }
            const frame0 = /** @type {Ruleset & { functionRegistry?: { addMultiple: (fns: object) => void } }} */ (context.frames[0]);
            const registry = frame0 && frame0.functionRegistry;
            if (registry && this.root && this.root.functions) {
                registry.addMultiple(this.root.functions);
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
            let featureValue = /** @type {Node[]} */ (this.features.value);
            if (Array.isArray(featureValue) && featureValue.length >= 1) {
                const expr = featureValue[0];
                if (expr.type === 'Expression' && Array.isArray(expr.value) && /** @type {Node[]} */ (expr.value).length >= 2) {
                    featureValue = /** @type {Node[]} */ (expr.value);
                    const isLayer = featureValue[0].type === 'Keyword' && featureValue[0].value === 'layer'
                        && featureValue[1].type === 'Paren';
                    if (isLayer) {
                        this.css = false;
                    }
                }
            }
        }
        if (this.options.inline) {
            const contents = new Anonymous(
                /** @type {string} */ (/** @type {unknown} */ (this.root)),
                0,
                {
                    filename: this.importedFilename,
                    reference: this.path._fileInfo && this.path._fileInfo.reference
                },
                true,
                true
            );

            return this.features ? new Media([contents], /** @type {Node[]} */ (this.features.value)) : [contents];
        } else if (this.css || this.layerCss) {
            const newImport = new Import(this.evalPath(context), features, this.options, this._index || 0);
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
                let featureValue = /** @type {Node[]} */ (this.features.value);
                if (Array.isArray(featureValue) && featureValue.length === 1) {
                    const expr = featureValue[0];
                    if (expr.type === 'Expression' && Array.isArray(expr.value) && /** @type {Node[]} */ (expr.value).length >= 2) {
                        featureValue = /** @type {Node[]} */ (expr.value);
                        const isLayer = featureValue[0].type === 'Keyword' && featureValue[0].value === 'layer'
                            && featureValue[1].type === 'Paren';
                        if (isLayer) {
                            this.layerCss = true;
                            featureValue[0] = new Expression(/** @type {Node[]} */ (featureValue.slice(0, 2)));
                            featureValue.splice(1, 1);
                            /** @type {Expression} */ (featureValue[0]).noSpacing = true;
                            return this;
                        }
                    }
                }
            }
            ruleset = new Ruleset(null, utils.copyArray(this.root.rules));
            ruleset.evalImports(context);

            return this.features ? new Media(ruleset.rules, /** @type {Node[]} */ (this.features.value)) : ruleset.rules;
        } else {
            if (this.features) {
                let featureValue = /** @type {Node[]} */ (this.features.value);
                if (Array.isArray(featureValue) && featureValue.length >= 1) {
                    featureValue = /** @type {Node[]} */ (featureValue[0].value);
                    if (Array.isArray(featureValue) && featureValue.length >= 2) {
                        const isLayer = featureValue[0].type === 'Keyword' && featureValue[0].value === 'layer'
                            && featureValue[1].type === 'Paren';
                        if (isLayer) {
                            this.css = true;
                            featureValue[0] = new Expression(/** @type {Node[]} */ (featureValue.slice(0, 2)));
                            featureValue.splice(1, 1);
                            /** @type {Expression} */ (featureValue[0]).noSpacing = true;
                            return this;
                        }
                    }
                }
            }
            return [];
        }
    }
}

export default Import;
