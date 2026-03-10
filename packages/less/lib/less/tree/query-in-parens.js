import Node from './node.js';

class QueryInParens extends Node {
    get type() { return 'QueryInParens'; }

    constructor(op, l, m, op2, r, i) {
        super();
        this.op = op.trim();
        this.lvalue = l;
        this.mvalue = m;
        this.op2 = op2 ? op2.trim() : null;
        this.rvalue = r;
        this._index = i;
    }

    accept(visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.mvalue = visitor.visit(this.mvalue);
        if (this.rvalue) {
            this.rvalue = visitor.visit(this.rvalue);
        }
    }

    eval(context) {
        const node = new QueryInParens(
            this.op,
            this.lvalue.eval(context),
            this.mvalue.eval(context),
            this.op2,
            this.rvalue ? this.rvalue.eval(context) : null,
            this._index
        );
        return node;
    }

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
