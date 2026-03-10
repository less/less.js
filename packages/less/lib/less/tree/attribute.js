// @ts-check
/** @import { EvalContext, CSSOutput } from './node.js' */
import Node from './node.js';

class Attribute extends Node {
    get type() { return 'Attribute'; }

    /**
     * @param {string | Node} key
     * @param {string} op
     * @param {string | Node} value
     * @param {string} cif
     */
    constructor(key, op, value, cif) {
        super();
        this.key = key;
        this.op = op;
        this.value = value;
        this.cif = cif;
    }

    /**
     * @param {EvalContext} context
     * @returns {Attribute}
     */
    eval(context) {
        return new Attribute(
            /** @type {Node} */ (this.key).eval ? /** @type {Node} */ (this.key).eval(context) : /** @type {string} */ (this.key),
            this.op,
            (this.value && /** @type {Node} */ (this.value).eval) ? /** @type {Node} */ (this.value).eval(context) : this.value,
            this.cif
        );
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add(this.toCSS(context));
    }

    /**
     * @param {EvalContext} context
     * @returns {string}
     */
    toCSS(context) {
        let value = /** @type {Node} */ (this.key).toCSS ? /** @type {Node} */ (this.key).toCSS(context) : /** @type {string} */ (this.key);

        if (this.op) {
            value += this.op;
            value += (/** @type {Node} */ (this.value).toCSS ? /** @type {Node} */ (this.value).toCSS(context) : /** @type {string} */ (this.value));
        }

        if (this.cif) {
            value = value + ' ' + this.cif;
        }

        return `[${value}]`;
    }
}

export default Attribute;
