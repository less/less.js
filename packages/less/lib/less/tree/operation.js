// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor } from './node.js' */
import Node from './node.js';
import Color from './color.js';
import Dimension from './dimension.js';
import * as Constants from '../constants.js';
const MATH = Constants.Math;

/**
 * A CSS function such as var() or env() only resolves in the browser, so an operation
 * holding one cannot be computed here. eval() leaves such an operation intact, which
 * makes it an operand an enclosing operator cannot compute either, so the search has
 * to descend into nested operations rather than look at the direct operands alone.
 * @param {Node} node
 * @returns {boolean}
 */
function hasRuntimeCall(node) {
    if (node.type === 'Call') {
        return true;
    }
    return node instanceof Operation && node.operands.some(hasRuntimeCall);
}

/**
 * Binding strength of each operator, so a nested operation left for the browser keeps
 * the grouping its tree already has. `(a - b) * c` printed flat is `a - b * c`, which
 * parses back the other way round.
 * @type {Record<string, number>}
 */
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, './': 2 };

/**
 * @param {Node} operand
 * @param {string} op
 * @param {boolean} isRight the operand sits on the right of `op`
 * @returns {boolean}
 */
function needsParens(operand, op, isRight) {
    if (!(operand instanceof Operation)) {
        return false;
    }
    const outer = PRECEDENCE[op] || 0;
    const inner = PRECEDENCE[operand.op] || 0;
    if (inner < outer) {
        return true;
    }
    // `a - (b - c)` and `a / (b / c)` do not survive losing them either.
    return isRight && inner === outer && op !== '+' && op !== '*';
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
                if (hasRuntimeCall(a) || hasRuntimeCall(b)) {
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
        this.genOperand(context, output, 0);
        if (this.isSpaced) {
            output.add(' ');
        }
        output.add(this.op);
        if (this.isSpaced) {
            output.add(' ');
        }
        this.genOperand(context, output, 1);
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     * @param {0 | 1} index
     */
    genOperand(context, output, index) {
        const operand = this.operands[index];
        const parens = needsParens(operand, this.op, index === 1);
        if (parens) {
            output.add('(');
        }
        operand.genCSS(context, output);
        if (parens) {
            output.add(')');
        }
    }
}

export default Operation;
