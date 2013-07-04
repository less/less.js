(function (tree) {

tree.Comment = function (value, silent, index, currentFileInfo) {
    this.value = value;
    this.silent = !!silent;
    this.currentFileInfo = currentFileInfo;
};
tree.Comment.prototype = {
    type: "Comment",
    toCSS: function (env) {
        var debugInfo = "";
        if (this.debugInfo) {
            debugInfo = tree.debugInfo(env, this);
        }
        var isReference = (this.currentFileInfo && this.currentFileInfo.reference && !this.isReferenced),
            isCompressed = env.compress && !this.value.match(/^\/\*!/);
        return (isReference || isCompressed) ? '' : (debugInfo + this.value);
    },
    eval: function () { return this; },
    markReferenced: function () {
        this.isReferenced = true;
    }
};

})(require('../tree'));
