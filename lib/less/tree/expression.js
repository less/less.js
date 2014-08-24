var Node = require("./node.js"),
    Paren = require("./paren.js"),
    Comment = require("./comment.js");

var Expression = function (value) { this.value = value; };
Expression.prototype = new Node();
Expression.prototype.type = "Expression";
Expression.prototype.accept = function (visitor) {
    if (this.value) {
        this.value = visitor.visitArray(this.value);
    }
};
Expression.prototype.eval = function (env) {
    var returnValue,
        inParenthesis = this.parens && !this.parensInOp,
        doubleParen = false;
    if (inParenthesis) {
        env.inParenthesis();
    }
    if (this.value.length > 1) {
        returnValue = new(Expression)(this.value.map(function (e) {
            return e.eval(env);
        }));
    } else if (this.value.length === 1) {
        if (this.value[0].parens && !this.value[0].parensInOp) {
            doubleParen = true;
        }
        returnValue = this.value[0].eval(env);
    } else {
        returnValue = this;
    }
    if (inParenthesis) {
        env.outOfParenthesis();
    }
    if (this.parens && this.parensInOp && !(env.isMathOn()) && !doubleParen) {
        returnValue = new(Paren)(returnValue);
    }
    return returnValue;
};
Expression.prototype.genCSS = function (env, output) {
    for(var i = 0; i < this.value.length; i++) {
        this.value[i].genCSS(env, output);
        if (i + 1 < this.value.length) {
            output.add(" ");
        }
    }
};
Expression.prototype.throwAwayComments = function () {
    this.value = this.value.filter(function(v) {
        return !(v instanceof Comment);
    });
};
module.exports = Expression;
