(function (tree) {

tree.Expression = function (value) { this.value = value };
tree.Expression.prototype = {
    eval: function (env) {
        var returnValue;
        if (this.parens && !this.parensInOp) {
            if (!env.parensStack) {
                env.parensStack = [];
            }
            env.parensStack.push(true);
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
        if (this.parens && !this.parensInOp) {
            env.parensStack.pop();
        }
        if (this.parens && this.parensInOp && !(env.parensStack && env.parensStack.length)) {
            returnValue = new(tree.Paren)(returnValue);
        }
        return returnValue;
    },
    toCSS: function (env) {
        return this.value.map(function (e) {
            return e.toCSS ? e.toCSS(env) : '';
        }).join(' ');
    }
};

})(require('../tree'));
