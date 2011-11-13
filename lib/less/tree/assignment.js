(function (tree) {

tree.assignment = function (key, val) {
    this.key = key;
    this.value = val;
};
tree.assignment.prototype = {
    toCSS: function () {
        return this.key + (this.value.toCSS ? this.value.toCSS() : this.value);
    },
    eval: function (env) {
        if (this.value.eval) { this.value = this.value.eval(env) }
        return this;
    }
};

})(require('less/tree'));