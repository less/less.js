// @ts-check
/** @import { EvalContext, TreeVisitor } from './node.js' */
import Node from './node.js';

class Condition extends Node {
    get type() { return 'Condition'; }

    /**
     * @param {string} op
     * @param {Node} l
     * @param {Node} r
     * @param {number} i
     * @param {boolean} negate
     */
    constructor(op, l, r, i, negate) {
        super();
        this.op = op.trim();
        this.lvalue = l;
        this.rvalue = r;
        this._index = i;
        this.negate = negate;
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.rvalue = visitor.visit(this.rvalue);
    }

    /**
     * @param {EvalContext} context
     * @returns {boolean}
     * @suppress {checkTypes}
     */
    // @ts-ignore - Condition.eval returns boolean, not Node (used as guard condition)
    eval(context) {
        const a = this.lvalue.eval(context);
        const b = this.rvalue.eval(context);
        /** @type {boolean} */
        let result;

        switch (this.op) {
            case 'and': result = Boolean(a && b); break;
            case 'or':  result = Boolean(a || b); break;
            default:
                switch (Node.compare(a, b)) {
                    case -1:
                        result = this.op === '<' || this.op === '=<' || this.op === '<=';
                        break;
                    case 0:
                        result = this.op === '=' || this.op === '>=' || this.op === '=<' || this.op === '<=';
                        break;
                    case 1:
                        result = this.op === '>' || this.op === '>=';
                        break;
                    default:
                        result = false;
                }
        }

        return this.negate ? !result : result;
    }
}

export default Condition;
