if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Operation = function Operation(op, operands) {
    this.op = op.trim();
    this.operands = operands;
};
tree.Operation.prototype.eval = function (env) {
    var a = this.operands[0],
        b = this.operands[1],
        temp;

    if (a instanceof tree.Dimension) {
        temp = b, b = a, a = temp;
    }
    return a.eval(env).operate(this.op, b.eval(env));
};

