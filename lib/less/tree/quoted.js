(function (tree) {

tree.Quoted = function (value, content) {
    this.value = value;
    this.content = content;
};
tree.Quoted.prototype = {
    toCSS: function () {
        return this.value;
    },
    eval: function () {
        return this;
    }
};

})(require('less/tree'));
