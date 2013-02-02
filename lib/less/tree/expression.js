(function (tree) {

tree.Expression = function (value) { this.value = value; };
tree.Expression.prototype = {
    eval: function (env) {
        var returnValue,
            inParenthesis = this.parens && !this.parensInOp;
        if (inParenthesis) {
            env.inParenthesis();
        }
        if (this.value.length > 1) {
            returnValue = new(tree.Expression)(this.value.map(function (e) {
                return e.eval(env);
            }));
        } else if (this.value.length === 1) {
            returnValue = this.value[0].eval(env);
        } else {
            returnValue = this;
        }
        if (inParenthesis) {
            env.outOfParenthesis();
        }
        if (this.parens && this.parensInOp && !(env.isMathsOn())) {
            returnValue = new(tree.Paren)(returnValue);
        }
        return returnValue;
    },
    toCSS: function (env) {
        return this.value.map(function (e) {
            return e.toCSS ? e.toCSS(env) : '';
        }).join(' ');
    },
    throwAwayComments: function () {
        this.value = this.value.filter(function(v) {
            return !(v instanceof tree.Comment);
        });
    }
};

})(require('../tree'));
