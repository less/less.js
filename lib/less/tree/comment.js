(function (tree) {

tree.Comment = function (value, silent) {
    this.value = value;
    this.silent = !!silent;
};
tree.Comment.prototype = {
    type: "Comment",
    toCSS: function (env) {
        if (this.value.match(/\/\*!/)) return this.value;
        return env.compress ? '' : this.value;
    },
    eval: function () { return this }
};

})(require('../tree'));
