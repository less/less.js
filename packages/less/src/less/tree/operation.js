import Node from './node';
import Color from './color';
import Dimension from './dimension';
import * as Constants from '../constants';
import Call from './call';
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
        var a = this.evalVariable(context, this.operands[0])
        if (!a) {
            a = this.operands[0].eval(context)
        }
        var b = this.evalVariable(context, this.operands[1]);
        if (!b) {
            b = this.operands[1].eval(context);
        }
        var op;

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
    },

    find: function (obj, fun) {
        for (var i_2 = 0, r = void 0; i_2 < obj.length; i_2++) {
            r = fun.call(obj, obj[i_2]);
            if (r) {
                return r;
            }
        }
        return null;
    },

    evalVariable: function (context, operand) {
        if (operand.name === 'var' && operand.args.length === 1) {
            var varName = operand.args[0].toCSS();
            var variable = this.find(context.frames, function (frame) {
                var v = frame.variable(varName);
                if (v) {
                    if (v.important) {
                        var importantScope = context.importantScope[context.importantScope.length - 1];
                        importantScope.important = v.important;
                    }
                    // If in calc, wrap vars in a function call to cascade evaluate args first
                    if (context.inCalc) {
                        return (new Call('_SELF', [v.value])).eval(context);
                    }
                    else {
                        return v.value.eval(context);
                    }
                }
            });
            
            return variable;
        }
    },
});

export default Operation;
