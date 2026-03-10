// @ts-check
import Node from './node.js';

/** @import { EvalContext, CSSOutput } from './node.js' */

class Keyword extends Node {
    get type() { return 'Keyword'; }

    /** @param {string} value */
    constructor(value) {
        super();
        this.value = value;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        if (this.value === '%') { throw { type: 'Syntax', message: 'Invalid % without number' }; }
        output.add(/** @type {string} */ (this.value));
    }
}

Keyword.True = new Keyword('true');
Keyword.False = new Keyword('false');

export default Keyword;
