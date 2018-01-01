import Node from "./node";
import Paren from "./paren";
import Comment from "./comment";

class Expression extends Node {
    constructor(value) {
        super();
        this.value = value;
        if (!value) {
            throw new Error("Expression requires an array parameter");
        }
    }

    accept(visitor) {
        this.value = visitor.visitArray(this.value);
    }

    eval(context) {
        let returnValue;
        const inParenthesis = this.parens && !this.parensInOp;
        let doubleParen = false;
        if (inParenthesis) {
            context.inParenthesis();
        }
        if (this.value.length > 1) {
            returnValue = new Expression(this.value.map(e => e.eval(context)));
        } else if (this.value.length === 1) {
            if (this.value[0].parens && !this.value[0].parensInOp) {
                doubleParen = true;
            }
            returnValue = this.value[0].eval(context);
        } else {
            returnValue = this;
        }
        if (inParenthesis) {
            context.outOfParenthesis();
        }
        if (this.parens && this.parensInOp && !(context.isMathOn()) && !doubleParen) {
            returnValue = new Paren(returnValue);
        }
        return returnValue;
    }

    genCSS(context, output) {
        for (let i = 0; i < this.value.length; i++) {
            this.value[i].genCSS(context, output);
            if (i + 1 < this.value.length) {
                output.add(" ");
            }
        }
    }

    throwAwayComments() {
        this.value = this.value.filter(v => !(v instanceof Comment));
    }
}

Expression.prototype.type = "Expression";
export default Expression;
