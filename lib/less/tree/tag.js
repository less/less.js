(function (tree) {

tree.Tag = function (value) { this.value = value };
tree.Tag.prototype = {
    eval: function () { return this },
    toCSS: function () { return this.value }
};

})(require('less/tree'));
