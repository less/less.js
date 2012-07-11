(function (tree) {

tree.Value = function (value) {
    this.value = value;
    this.is = 'value';
};
tree.Value.prototype = {
    eval: function (env) {
        if (this.value.length === 1) {
            return this.value[0].eval(env);
        } else {
            return new(tree.Value)(tree.map.call(this.value, function (v) {
                return v.eval(env);
            }));
        }
    },
    toCSS: function (env) {
        return tree.map.call(this.value, function (e) {
            return e.toCSS(env);
        }).join(env.compress ? ',' : ', ');
    }
};

})(require('../tree'));
