(function (tree) {

tree.Keyword = function (value) {
    this.value = value;
    this.is = 'keyword';
};
tree.Keyword.prototype = {
    eval: function () { return this },
    toCSS: function () { return this.value }
};

})(require('less/tree'));
