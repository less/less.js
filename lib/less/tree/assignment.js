(function (tree) {

tree.Assignment = function (key, val) {
    this.key = key;
    this.value = val;
};
tree.Assignment.prototype = {
    toCSS: function () {
        return this.key + '=' + (this.value.toCSS ? this.value.toCSS() : this.value);
    },
    eval: function (env) {
        if (this.value.eval) { this.value = this.value.eval(env) }
        return this;
    }
};

})(require('../tree'));