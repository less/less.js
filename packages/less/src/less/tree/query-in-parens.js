import Node from './node';

const QueryInParens = function(op, l, r, i) {
    this.op = op.trim();
    this.lvalue = l;
    this.rvalue = r;
    this._index = i;
};

QueryInParens.prototype = Object.assign(new Node(), {
    type: 'QueryInParens',

    accept(visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.rvalue = visitor.visit(this.rvalue);
    },

    eval(context) {
        this.lvalue = this.lvalue.eval(context);
        this.rvalue = this.rvalue.eval(context);

        return this;
    },

    genCSS(context, output) {
        this.lvalue.genCSS(context, output);
        output.add(' ' + this.op + ' ');
        this.rvalue.genCSS(context, output);
    },
});

export default QueryInParens;
