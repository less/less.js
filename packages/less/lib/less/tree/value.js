// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor } from './node.js' */
import Node from './node.js';

class Value extends Node {
    get type() { return 'Value'; }

    /** @param {Node[] | Node} value */
    constructor(value) {
        super();
        if (!value) {
            throw new Error('Value requires an array argument');
        }
        if (!Array.isArray(value)) {
            this.value = [ value ];
        }
        else {
            this.value = value;
        }
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        if (this.value) {
            this.value = visitor.visitArray(/** @type {Node[]} */ (this.value));
        }
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        const value = /** @type {Node[]} */ (this.value);
        if (value.length === 1) {
            return value[0].eval(context);
        } else {
            return new Value(value.map(function (v) {
                return v.eval(context);
            }));
        }
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        const value = /** @type {Node[]} */ (this.value);
        let i;
        for (i = 0; i < value.length; i++) {
            value[i].genCSS(context, output);
            if (i + 1 < value.length) {
                output.add((context && context.compress) ? ',' : ', ');
            }
        }
    }
}

export default Value;
