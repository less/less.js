(function(tree) {

tree.Value = function Value(value) {
    this.value = value;
    this.is = 'value';
};

tree.Value.prototype = {
    eval: function(env) {
        if (this.value.length === 1) {
            return this.value[0].eval(env);
        } else {
            return new tree.Value(this.value.map(function(v) {
                return v.eval(env);
            }));
        }
    },
    toString: function(env, selector, sep, format) {
        return this.value.map(function(e) {
            return e.toString(env, format);
        }).join(sep || ', ');
    },
    clone: function() {
        var obj = Object.create(tree.Value.prototype);
        if (Array.isArray(obj)) obj.value = this.value.slice();
        else obj.value = this.value;
        obj.is = this.is;
        return obj;
    }
};

})(require('../tree'));
