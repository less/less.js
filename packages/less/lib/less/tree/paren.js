// @ts-check
/** @import { EvalContext, CSSOutput } from './node.js' */
import Node from './node.js';

class Paren extends Node {
    get type() { return 'Paren'; }

    /** @param {Node} node */
    constructor(node) {
        super();
        this.value = node;
        /** @type {boolean | undefined} */
        this.noSpacing = undefined;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add('(');
        /** @type {Node} */ (this.value).genCSS(context, output);
        output.add(')');
    }

    /**
     * @param {EvalContext} context
     * @returns {Paren}
     */
    eval(context) {
        const paren = new Paren(/** @type {Node} */ (this.value).eval(context));

        if (this.noSpacing) {
            paren.noSpacing = true;
        }

        return paren;
    }
}

export default Paren;
