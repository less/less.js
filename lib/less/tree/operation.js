var Node = require("./node.js"),
    Color = require("./color.js"),
    Dimension = require("./dimension.js");

var Operation = function (op, operands, isSpaced) {
    this.op = op.trim();
    this.operands = operands;
    this.isSpaced = isSpaced;
};
Operation.prototype = new Node();
Operation.prototype.type = "Operation";
Operation.prototype.accept = function (visitor) {
    this.operands = visitor.visit(this.operands);
};
Operation.prototype.eval = function (env) {
    var a = this.operands[0].eval(env),
        b = this.operands[1].eval(env);

    if (env.isMathOn()) {
        if (a instanceof Dimension && b instanceof Color) {
            a = a.toColor();
        }
        if (b instanceof Dimension && a instanceof Color) {
            b = b.toColor();
        }
        if (!a.operate) {
            throw { type: "Operation",
                    message: "Operation on an invalid type" };
        }

        return a.operate(env, this.op, b);
    } else {
        return new(Operation)(this.op, [a, b], this.isSpaced);
    }
};
Operation.prototype.genCSS = function (env, output) {
    this.operands[0].genCSS(env, output);
    if (this.isSpaced) {
        output.add(" ");
    }
    output.add(this.op);
    if (this.isSpaced) {
        output.add(" ");
    }
    this.operands[1].genCSS(env, output);
};

module.exports = Operation;
