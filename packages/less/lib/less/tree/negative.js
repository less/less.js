// @ts-check
/** @import { EvalContext, CSSOutput } from './node.js' */
import Node from './node.js';
import Operation from './operation.js';
import Dimension from './dimension.js';

class Negative extends Node {
    get type() { return 'Negative'; }

    /** @param {Node} node */
    constructor(node) {
        super();
        this.value = node;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add('-');
        /** @type {Node} */ (this.value).genCSS(context, output);
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        if (context.isMathOn('*')) {
            return (new Operation('*', [new Dimension(-1), /** @type {Node} */ (this.value)], false)).eval(context);
        }
        return new Negative(/** @type {Node} */ (this.value).eval(context));
    }
}

export default Negative;
