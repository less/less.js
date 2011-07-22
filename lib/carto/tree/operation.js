(function(tree) {


tree.Operation = function Operation(op, operands, index) {
    this.op = op.trim();
    this.operands = operands;
    this.index = index;
};
tree.Operation.prototype.eval = function(env) {
    var a = this.operands[0].eval(env),
        b = this.operands[1].eval(env),
        temp;

    if (a.is === 'undefined' || b.is === 'undefined') {
        return {
            is: 'undefined',
            value: 'undefined'
        };
    }

    if (a instanceof tree.Dimension && b instanceof tree.Color) {
        if (this.op === '*' || this.op === '+') {
            temp = b, b = a, a = temp;
        } else {
            throw {
                name: "OperationError",
                message: "Can't substract or divide a color from a number",
                index: this.index
            };
        }
    }

    if (a instanceof tree.Quoted || b instanceof tree.Quoted) {
        env.error({
           message: 'One cannot add, subtract, divide, or multiply strings.',
           index: this.index,
           type: 'runtime',
           filename: this.filename,
        });
        return {
            is: 'undefined',
            value: 'undefined'
        };
    }

    return a.operate(this.op, b);
};

tree.operate = function(op, a, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
    }
};

})(require('../tree'));
