node.Operation = function Operation(op, operands) {
    this.op = op.trim();
    this.operands = operands;
};
node.Operation.prototype.eval = function (env) {
    return this.operands[0].eval(env)[this.op](this.operands[1].eval(env));
};

