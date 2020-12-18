import Node from './node';

const Condition = function(op, l, r, i, negate) {
    this.op = op.trim();
    this.lvalue = l;
    this.rvalue = r;
    this._index = i;
    this.negate = negate;
};

Condition.prototype = Object.assign(new Node(), {
    type: 'Condition',

    accept(visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.rvalue = visitor.visit(this.rvalue);
    },

    eval(context) {
        const result = (function (op, a, b) {
            switch (op) {
                case 'and': return a && b;
                case 'or':  return a || b;
                default:
                    switch (Node.compare(a, b)) {
                        case -1:
                            return op === '<' || op === '=<' || op === '<=';
                        case 0:
                            return op === '=' || op === '>=' || op === '=<' || op === '<=';
                        case 1:
                            return op === '>' || op === '>=';
                        default:
                            return false;
                    }
            }
        })(this.op, this.lvalue.eval(context), this.rvalue.eval(context));

        return this.negate ? !result : result;
    }
});

export default Condition;
