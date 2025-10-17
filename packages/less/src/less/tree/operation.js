import Node from './node';
import Color from './color';
import Dimension from './dimension';
import Call from './call';
import Anonymous from './anonymous';
import * as Constants from '../constants';
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
            
            // Check if we can perform the operation
            if (!a.operate || !b.operate) {
                if (
                    (a instanceof Operation || b instanceof Operation)
                    && a.op === '/' && context.math === MATH.PARENS_DIVISION
                ) {
                    return new Operation(this.op, [a, b], this.isSpaced);
                }
                
                // If operands contain CSS variables (Call nodes like var()) or other 
                // non-operable types, preserve the operation as-is for CSS output
                if (a instanceof Call || b instanceof Call || 
                    a instanceof Anonymous || b instanceof Anonymous) {
                    return new Operation(this.op, [a, b], this.isSpaced);
                }
                
                throw { type: 'Operation',
                    message: `Operation on an invalid type: cannot perform '${this.op}' on ${a.type || typeof a} and ${b.type || typeof b}` };
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
