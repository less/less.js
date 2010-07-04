(function (tree) {

tree.URL = function (val) {
    this.value = val;
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS() + ")";
    },
    eval: function (ctx) {
        this.value = this.value.eval(ctx);
        return this;
    }
};

})(require('less/tree'));
