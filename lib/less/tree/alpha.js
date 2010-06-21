(function (tree) {

tree.Alpha = function (val) {
    this.value = val;
};
tree.Alpha.prototype = {
    toCSS: function () {
        return "alpha(opacity=" +
               (this.value.toCSS ? this.value.toCSS() : this.value) + ")";
    },
    eval: function () { return this }
};

})(require('less/tree'));
