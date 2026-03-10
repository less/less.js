// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor, FileInfo, VisibilityInfo } from './node.js' */
import Node from './node.js';
import Paren from './paren.js';
import Combinator from './combinator.js';

class Element extends Node {
    get type() { return 'Element'; }

    /**
     * @param {Combinator | string} combinator
     * @param {string | Node} value
     * @param {boolean} [isVariable]
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(combinator, value, isVariable, index, currentFileInfo, visibilityInfo) {
        super();
        this.combinator = combinator instanceof Combinator ?
            combinator : new Combinator(combinator);

        if (typeof value === 'string') {
            this.value = value.trim();
        } else if (value) {
            this.value = value;
        } else {
            this.value = '';
        }
        /** @type {boolean | undefined} */
        this.isVariable = isVariable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.combinator, this);
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        const value = this.value;
        this.combinator = /** @type {Combinator} */ (visitor.visit(this.combinator));
        if (typeof value === 'object') {
            this.value = visitor.visit(/** @type {Node} */ (value));
        }
    }

    /** @param {EvalContext} context */
    eval(context) {
        return new Element(this.combinator,
            /** @type {Node} */ (this.value).eval ? /** @type {Node} */ (this.value).eval(context) : /** @type {string} */ (this.value),
            this.isVariable,
            this.getIndex(),
            this.fileInfo(), this.visibilityInfo());
    }

    clone() {
        return new Element(this.combinator,
            /** @type {string | Node} */ (this.value),
            this.isVariable,
            this.getIndex(),
            this.fileInfo(), this.visibilityInfo());
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add(this.toCSS(context), this.fileInfo(), this.getIndex());
    }

    /** @param {EvalContext} [context] */
    toCSS(context) {
        /** @type {EvalContext & { firstSelector?: boolean }} */
        const ctx = context || {};
        let value = this.value;
        const firstSelector = ctx.firstSelector;
        if (value instanceof Paren) {
            // selector in parens should not be affected by outer selector
            // flags (breaks only interpolated selectors - see #1973)
            ctx.firstSelector = true;
        }
        value = /** @type {Node} */ (value).toCSS ? /** @type {Node} */ (value).toCSS(ctx) : /** @type {string} */ (value);
        ctx.firstSelector = firstSelector;
        if (value === '' && this.combinator.value.charAt(0) === '&') {
            return '';
        } else {
            return this.combinator.toCSS(ctx) + value;
        }
    }
}

export default Element;
