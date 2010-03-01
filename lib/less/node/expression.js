if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Expression = function Expression(value) { this.value = value };
tree.Expression.prototype.eval = function (env) {
    if (this.value.length > 1) {
        throw new(Error)("can't eval compound expression");
    } else {
        return this.value[0].eval(env); 
    }
};
tree.Expression.prototype.toCSS = function (env) {
    var evaled;
    evaled = this.value.map(function (e) {
        if (e.eval) {
            e = e.eval(env);
        }
        return e.toCSS ? e.toCSS(env) : e;
    });
    return evaled.join(' ');
};
