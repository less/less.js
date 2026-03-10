// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor } from './node.js' */
import Node from './node.js';

class QueryInParens extends Node {
    get type() { return 'QueryInParens'; }

    /**
     * @param {string} op
     * @param {Node} l
     * @param {Node} m
     * @param {string | null} op2
     * @param {Node | null} r
     * @param {number} i
     */
    constructor(op, l, m, op2, r, i) {
        super();
        this.op = op.trim();
        this.lvalue = l;
        this.mvalue = m;
        this.op2 = op2 ? op2.trim() : null;
        /** @type {Node | null} */
        this.rvalue = r;
        this._index = i;
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.mvalue = visitor.visit(this.mvalue);
        if (this.rvalue) {
            this.rvalue = visitor.visit(this.rvalue);
        }
    }

    /** @param {EvalContext} context */
    eval(context) {
        const node = new QueryInParens(
            this.op,
            this.lvalue.eval(context),
            this.mvalue.eval(context),
            this.op2,
            this.rvalue ? this.rvalue.eval(context) : null,
            this._index || 0
        );
        return node;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        this.lvalue.genCSS(context, output);
        output.add(' ' + this.op + ' ');
        this.mvalue.genCSS(context, output);
        if (this.rvalue) {
            output.add(' ' + this.op2 + ' ');
            this.rvalue.genCSS(context, output);
        }
    }
}

export default QueryInParens;
