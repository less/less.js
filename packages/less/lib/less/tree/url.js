// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor, FileInfo } from './node.js' */
import Node from './node.js';

/**
 * @param {string} path
 * @returns {string}
 */
function escapePath(path) {
    return path.replace(/[()'"\s]/g, function(match) { return `\\${match}`; });
}

class URL extends Node {
    get type() { return 'Url'; }

    /**
     * @param {Node} val
     * @param {number} index
     * @param {FileInfo} currentFileInfo
     * @param {boolean} [isEvald]
     */
    constructor(val, index, currentFileInfo, isEvald) {
        super();
        this.value = val;
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {boolean | undefined} */
        this.isEvald = isEvald;
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.value = visitor.visit(/** @type {Node} */ (this.value));
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add('url(');
        /** @type {Node} */ (this.value).genCSS(context, output);
        output.add(')');
    }

    /** @param {EvalContext} context */
    eval(context) {
        const val = /** @type {Node} */ (this.value).eval(context);
        let rootpath;

        if (!this.isEvald) {
            // Add the rootpath if the URL requires a rewrite
            rootpath = this.fileInfo() && this.fileInfo().rootpath;
            if (typeof rootpath === 'string' &&
                typeof val.value === 'string' &&
                context.pathRequiresRewrite(/** @type {string} */ (val.value))) {
                if (!/** @type {import('./quoted.js').default} */ (val).quote) {
                    rootpath = escapePath(rootpath);
                }
                val.value = context.rewritePath(/** @type {string} */ (val.value), rootpath);
            } else {
                val.value = context.normalizePath(/** @type {string} */ (val.value));
            }

            // Add url args if enabled
            if (context.urlArgs) {
                if (!/** @type {string} */ (val.value).match(/^\s*data:/)) {
                    const delimiter = /** @type {string} */ (val.value).indexOf('?') === -1 ? '?' : '&';
                    const urlArgs = delimiter + context.urlArgs;
                    if (/** @type {string} */ (val.value).indexOf('#') !== -1) {
                        val.value = /** @type {string} */ (val.value).replace('#', `${urlArgs}#`);
                    } else {
                        val.value += urlArgs;
                    }
                }
            }
        }

        return new URL(val, this.getIndex(), this.fileInfo(), true);
    }
}

export default URL;
