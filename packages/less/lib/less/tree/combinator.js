// @ts-check
import Node from './node.js';

/** @import { EvalContext, CSSOutput } from './node.js' */

/** @type {Record<string, boolean>} */
const _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};

class Combinator extends Node {
    get type() { return 'Combinator'; }

    /** @param {string} value */
    constructor(value) {
        super();
        if (value === ' ') {
            this.value = ' ';
            this.emptyOrWhitespace = true;
        } else {
            this.value = value ? value.trim() : '';
            this.emptyOrWhitespace = this.value === '';
        }
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        const spaceOrEmpty = (context.compress || _noSpaceCombinators[/** @type {string} */ (this.value)]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
}

export default Combinator;
