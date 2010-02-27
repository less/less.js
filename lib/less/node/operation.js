node.Operation = function Operation(op, operands) {
    this.op = op.trim();
    this.operands = operands;
};
node.Operation.prototype.eval = function (env) {
    var a = this.operands[0],
        b = this.operands[1],
        temp;

    if (a instanceof node.Dimension) {
        temp = b, b = a, a = temp;
    }
    return a.eval(env).operate(this.op, b.eval(env));
};

