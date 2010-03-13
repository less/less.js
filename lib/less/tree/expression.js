if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Expression = function Expression(value) { this.value = value };
tree.Expression.prototype = {
    eval: function (env) {
        if (this.value.length > 1) {
            return new(tree.Expression)(this.value.map(function (e) {
                return e.eval(env);
            }));
        } else {
            return this.value[0].eval(env);
        }
    },
    toCSS: function (env) {
        var evaled;
        evaled = this.value.map(function (e) {
            if (e.eval) {
                e = e.eval(env);
            }
            return e.toCSS ? e.toCSS(env) : e;
        });
        return evaled.join(' ');
    }
};
