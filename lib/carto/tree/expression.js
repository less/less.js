(function(tree) {

tree.Expression = function Expression(value) {
    this.value = value;
};

tree.Expression.prototype = {
    is: 'expression',
    ev: function(env) {
        if (this.value.length > 1) {
            return new tree.Expression(this.value.map(function(e) {
                return e.ev(env);
            }));
        } else {
            return this.value[0].ev(env);
        }
    },

    toString: function(env) {
        return this.value.map(function(e) {
            return e.toString(env);
        }).join(' ');
    }
};

})(require('../tree'));
