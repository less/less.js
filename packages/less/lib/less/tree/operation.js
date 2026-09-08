// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor } from './node.js' */
import Node from './node.js';
import Color from './color.js';
import Dimension from './dimension.js';
import * as Constants from '../constants.js';
const MATH = Constants.Math;

/**
 * CSS functions such as var() and relative-color channel keywords
 * (`r`/`g`/`b`, `alpha`, `none`, ...) only resolve in the browser.
 * An operation holding one cannot be computed here, so eval() leaves
 * it intact. Ordinary keywords (`auto`, `inherit`) are not colorOperands,
 * so they never become Operation nodes; they are unchanged.
 *
 * Nested operations have to be searched too: a pass-through inner op is
 * itself uncomputable, same as a Call. A hex origin such as
 * `rgb(from #112233 r g b / 0.9)` has no Call at all.
 *
 * @param {Node} node
 * @returns {boolean}
 */
const RELATIVE_COLOR_CHANNELS = new Set([
    'r', 'g', 'b',
    'h', 's', 'l',
    'w', 'c',
    'a', 'x', 'y', 'z',
    'alpha', 'none'
]);

function isBrowserOperand(node) {
    if (node.type === 'Call') {
        return true;
    }
    if (node.type === 'Keyword') {
        return RELATIVE_COLOR_CHANNELS.has(String(node.value).toLowerCase());
    }
    return node instanceof Operation && node.operands.some(isBrowserOperand);
}

class Operation extends Node {
    get type() { return 'Operation'; }

    /**
     * @param {string} op
     * @param {Node[]} operands
     * @param {boolean} isSpaced
     */
    constructor(op, operands, isSpaced) {
        super();
        this.op = op.trim();
        this.operands = operands;
        this.isSpaced = isSpaced;
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.operands = visitor.visitArray(this.operands);
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        let a = this.operands[0].eval(context), b = this.operands[1].eval(context), op;

        if (context.isMathOn(this.op)) {
            op = this.op === './' ? '/' : this.op;
            if (a instanceof Dimension && b instanceof Color) {
                a = /** @type {Dimension} */ (a).toColor();
            }
            if (b instanceof Dimension && a instanceof Color) {
                b = /** @type {Dimension} */ (b).toColor();
            }
            if (!/** @type {Dimension | Color} */ (a).operate || !/** @type {Dimension | Color} */ (b).operate) {
                if (
                    (a instanceof Operation || b instanceof Operation)
                    && /** @type {Operation} */ (a).op === '/' && context.math === MATH.PARENS_DIVISION
                ) {
                    return new Operation(this.op, [a, b], this.isSpaced);
                }
                if (isBrowserOperand(a) || isBrowserOperand(b)) {
                    return new Operation(this.op, [a, b], this.isSpaced);
                }
                throw { type: 'Operation',
                    message: 'Operation on an invalid type' };
            }

            if (a instanceof Dimension) {
                return a.operate(context, op, /** @type {Dimension} */ (b));
            }
            return /** @type {Color} */ (a).operate(context, op, /** @type {Color} */ (b));
        } else {
            return new Operation(this.op, [a, b], this.isSpaced);
        }
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        this.operands[0].genCSS(context, output);
        if (this.isSpaced) {
            output.add(' ');
        }
        output.add(this.op);
        if (this.isSpaced) {
            output.add(' ');
        }
        this.operands[1].genCSS(context, output);
    }
}

export default Operation;
