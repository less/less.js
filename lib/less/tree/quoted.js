(function (tree) {

tree.Quoted = function Quoted(value, content) {
    this.value = value;
    this.content = content;
};
tree.Quoted.prototype = {
    toCSS: function () {
        var css = this.value;
        return css;
    },
    eval: function () {
        return this;
    }
};

})(require('less/tree'));
