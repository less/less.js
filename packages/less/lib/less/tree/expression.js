// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor } from './node.js' */
import Node from './node.js';
import Paren from './paren.js';
import Comment from './comment.js';
import Dimension from './dimension.js';
import Anonymous from './anonymous.js';

class Expression extends Node {
    get type() { return 'Expression'; }

    /**
     * @param {Node[]} value
     * @param {boolean} [noSpacing]
     */
    constructor(value, noSpacing) {
        super();
        this.value = value;
        /** @type {boolean | undefined} */
        this.noSpacing = noSpacing;
        /** @type {boolean | undefined} */
        this.parens = undefined;
        /** @type {boolean | undefined} */
        this.parensInOp = undefined;
        if (!value) {
            throw new Error('Expression requires an array parameter');
        }
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.value = visitor.visitArray(/** @type {Node[]} */ (this.value));
    }

    /** @param {EvalContext} context */
    eval(context) {
        const noSpacing = this.noSpacing;
        /** @type {Node | Expression} */
        let returnValue;
        const mathOn = context.isMathOn();
        const inParenthesis = this.parens;

        let doubleParen = false;
        if (inParenthesis) {
            context.inParenthesis();
        }
        const value = /** @type {Node[]} */ (this.value);
        if (value.length > 1) {
            returnValue = new Expression(value.map(function (e) {
                if (!e.eval) {
                    return e;
                }
                return e.eval(context);
            }), this.noSpacing);
        } else if (value.length === 1) {
            const first = /** @type {Expression} */ (value[0]);
            if (first.parens && !first.parensInOp && !context.inCalc) {
                doubleParen = true;
            }
            returnValue = value[0].eval(context);
        } else {
            returnValue = this;
        }
        if (inParenthesis) {
            context.outOfParenthesis();
        }
        if (this.parens && this.parensInOp && !mathOn && !doubleParen
            && (!(returnValue instanceof Dimension))) {
            returnValue = new Paren(returnValue);
        }
        /** @type {Expression} */ (returnValue).noSpacing =
            /** @type {Expression} */ (returnValue).noSpacing || noSpacing;
        return returnValue;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        const value = /** @type {Node[]} */ (this.value);
        for (let i = 0; i < value.length; i++) {
            value[i].genCSS(context, output);
            if (!this.noSpacing && i + 1 < value.length) {
                if (!(value[i + 1] instanceof Anonymous) ||
                    value[i + 1] instanceof Anonymous && /** @type {string} */ (value[i + 1].value) !== ',') {
                    output.add(' ');
                }
            }
        }
    }

    throwAwayComments() {
        this.value = /** @type {Node[]} */ (this.value).filter(function(v) {
            return !(v instanceof Comment);
        });
    }
}

export default Expression;
