import Node from './node.js';
import Color from './color.js';
import Dimension from './dimension.js';
import * as Constants from '../constants.js';
const MATH = Constants.Math;


const Operation = function(op, operands, isSpaced) {
    this.op = op.trim();
    this.operands = operands;
    this.isSpaced = isSpaced;
};

Operation.prototype = Object.assign(new Node(), {
    type: 'Operation',

    accept(visitor) {
        this.operands = visitor.visitArray(this.operands);
    },

    eval(context) {
        let a = this.operands[0].eval(context), b = this.operands[1].eval(context), op;

        if (context.isMathOn(this.op)) {
            op = this.op === './' ? '/' : this.op;
            if (a instanceof Dimension && b instanceof Color) {
                a = a.toColor();
            }
            if (b instanceof Dimension && a instanceof Color) {
                b = b.toColor();
            }
            if (!a.operate || !b.operate) {
                if (
                    (a instanceof Operation || b instanceof Operation)
                    && a.op === '/' && context.math === MATH.PARENS_DIVISION
                ) {
                    return new Operation(this.op, [a, b], this.isSpaced);
                }
                throw { type: 'Operation',
                    message: 'Operation on an invalid type' };
            }

            return a.operate(context, op, b);
        } else {
            return new Operation(this.op, [a, b], this.isSpaced);
        }
    },

    genCSS(context, output) {
        this.operands[0].genCSS(context, output);
        if (this.isSpaced) {
            output.add(' ');
        }
        output.add(this.op);
        if (this.isSpaced) {
            output.add(' ');
        }
        this.operands[1].genCSS(context, output);
    }
});

export default Operation;
