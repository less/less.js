(function (tree) {

tree.Anonymous = function (string) {
    this.value = string.content || string;
};
tree.Anonymous.prototype = {
    toCSS: function () {
        return this.value;
    },
    eval: function () { return this }
};

})(require('less/tree'));
