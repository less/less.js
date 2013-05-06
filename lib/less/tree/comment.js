(function (tree) {

tree.Comment = function (value, silent, index, currentFileInfo) {
    this.value = value;
    this.silent = !!silent;
    this.currentFileInfo = currentFileInfo;
};
tree.Comment.prototype = {
    type: "Comment",
    toCSS: function (env) {
        return (env.compress || (this.currentFileInfo && this.currentFileInfo.reference && !this.isReferenced)) ? '' : this.value;
    },
    eval: function () { return this; },
    markReferenced: function () {
        this.isReferenced = true;
    }
};

})(require('../tree'));
