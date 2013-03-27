(function (tree) {

tree.Comment = function (value, silent, index, currentFileInfo) {
    this.value = value;
    this.silent = !!silent;
    this.currentFileInfo = currentFileInfo;
};
tree.Comment.prototype = {
    type: "Comment",
    toCSS: function (env) {
        var isReference = (this.currentFileInfo && this.currentFileInfo.reference && !this.isReferenced),
            isCompressed = env.compress && !this.value.match(/^\/\*!/);
        return (isReference || isCompressed) ? '' : this.value;
    },
    eval: function () { return this; },
    markReferenced: function () {
        this.isReferenced = true;
    }
};

})(require('../tree'));
