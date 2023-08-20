import Node from './node';
import Paren from './paren';
import Comment from './comment';
import Dimension from './dimension';
import Anonymous from './anonymous';

const Expression = function(value, noSpacing) {
    this.value = value;
    this.noSpacing = noSpacing;
    if (!value) {
        throw new Error('Expression requires an array parameter');
    }
};

Expression.prototype = Object.assign(new Node(), {
    type: 'Expression',

    accept(visitor) {
        this.value = visitor.visitArray(this.value);
    },

    eval(context) {
        let returnValue;
        const mathOn = context.isMathOn();
        const inParenthesis = this.parens;

        let doubleParen = false;
        if (inParenthesis) {
            context.inParenthesis();
        }
        if (this.value.length > 1) {
            returnValue = new Expression(this.value.map(function (e) {
                if (!e.eval) {
                    return e;
                }
                return e.eval(context);
            }), this.noSpacing);
        } else if (this.value.length === 1) {
            if (this.value[0].parens && !this.value[0].parensInOp && !context.inCalc) {
                doubleParen = true;
            }
            returnValue = this.value[0].eval(context);
        } else {
            returnValue = this;
        }
        if (inParenthesis) {
            context.outOfParenthesis();
        }
        if (this.parens && this.parensInOp && !mathOn && !doubleParen
            && (!(returnValue instanceof Dimension))) {
            returnValue = new Paren(returnValue);
        }
        return returnValue;
    },

    genCSS(context, output) {
        for (let i = 0; i < this.value.length; i++) {
            this.value[i].genCSS(context, output);
            if (!this.noSpacing && i + 1 < this.value.length) {
                if (i + 1 < this.value.length && !(this.value[i + 1] instanceof Anonymous) ||
                    this.value[i + 1] instanceof Anonymous && this.value[i + 1].value !== ',') {
                    output.add(' ');
                }
            }
        }
    },

    throwAwayComments() {
        this.value = this.value.filter(function(v) {
            return !(v instanceof Comment);
        });
    }
});

export default Expression;
