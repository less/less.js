import Node from './node';

const QueryInParens = function (op, l, m, op2, r, i) {
    this.op = op.trim();
    this.lvalue = l;
    this.mvalue = m;
    this.op2 = op2 ? op2.trim() : null;
    this.rvalue = r;
    this._index = i;
};

QueryInParens.prototype = Object.assign(new Node(), {
    type: 'QueryInParens',

    accept(visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.mvalue = visitor.visit(this.mvalue);
        if (this.rvalue) {
            this.rvalue = visitor.visit(this.rvalue);
        }
    },

    eval(context) {
        this.lvalue = this.lvalue.eval(context);
        this.mvalue = this.mvalue.eval(context);
        if (this.rvalue) {
            this.rvalue = this.rvalue.eval(context);
        }
        return this;
    },

    genCSS(context, output) {
        this.lvalue.genCSS(context, output);
        output.add(' ' + this.op + ' ');
        this.mvalue.genCSS(context, output);
        if (this.rvalue) {
            output.add(' ' + this.op2 + ' ');
            this.rvalue.genCSS(context, output);
        }
    },
});

export default QueryInParens;
