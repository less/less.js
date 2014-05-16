(function (tree) {

tree.Condition = function (op, l, r, i, negate) {
    this.op = op.trim();
    this.lvalue = l;
    this.rvalue = r;
    this.index = i;
    this.negate = negate;
};
tree.Condition.prototype = {
    type: "Condition",
    accept: function (visitor) {
        this.lvalue = visitor.visit(this.lvalue);
        this.rvalue = visitor.visit(this.rvalue);
    },
    eval: function (env) {
        var result = (function (op, a, b) {
            switch (op) {
                case 'and': return a && b;
                case 'or':  return a || b;
                default:
                    switch (tree.compare(a, b)) {
                        case -1: return op === '<' || op === '=<' || op === '<=';
                        case  0: return op === '=' || op === '>=' || op === '=<' || op === '<=';
                        case  1: return op === '>' || op === '>=';
                        default: return false;
                    }
            }
        }) (this.op, this.lvalue.eval(env), this.rvalue.eval(env));
        
        return this.negate ? !result : result;
    }
};

})(require('../tree'));
