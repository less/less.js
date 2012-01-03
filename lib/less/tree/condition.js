(function (tree) {

tree.Condition = function (op, l, r, i) {
    this.op = op.trim();
    this.lvalue = l;
    this.rvalue = r;
    this.index = i;
};
tree.Condition.prototype.eval = function (env) {
    var a = this.lvalue.eval(env),
        b = this.rvalue.eval(env);

    var i = this.index, result

    switch (this.op) {
        case 'and':
            return a && b;
        case 'or':
            return a || b;
        default:
            if (a.compare) {
                result = a.compare(b);
            } else if (b.compare) {
                result = b.compare(a);
            } else {
                throw { type: "Type",
                        message: "Unable to perform comparison",
                        index: i };
            }
            switch (result) {
                case -1: return this.op === '<' || this.op === '=<' || this.op === '^=';
                case  0: return this.op === '=' || this.op === '>=' || this.op === '=<';
                case  1: return this.op === '>' || this.op === '>=' || this.op === '^=';
            }
    }
};

})(require('../tree'));
