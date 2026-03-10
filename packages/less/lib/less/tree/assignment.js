// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor } from './node.js' */
import Node from './node.js';

class Assignment extends Node {
    get type() { return 'Assignment'; }

    /**
     * @param {string} key
     * @param {Node} val
     */
    constructor(key, val) {
        super();
        this.key = key;
        this.value = val;
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.value = visitor.visit(/** @type {Node} */ (this.value));
    }

    /**
     * @param {EvalContext} context
     * @returns {Assignment}
     */
    eval(context) {
        if (/** @type {Node} */ (this.value).eval) {
            return new Assignment(this.key, /** @type {Node} */ (this.value).eval(context));
        }
        return this;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add(`${this.key}=`);
        if (/** @type {Node} */ (this.value).genCSS) {
            /** @type {Node} */ (this.value).genCSS(context, output);
        } else {
            output.add(/** @type {string} */ (/** @type {unknown} */ (this.value)));
        }
    }
}

export default Assignment;
