(function (tree) {

tree.Comment = function Comment(value) {
    this.value = value;
};
tree.Comment.prototype = {
    toCSS: function (env) {
        return env.compress ? '' : this.value;
    }
};

})(require('less/tree'));
