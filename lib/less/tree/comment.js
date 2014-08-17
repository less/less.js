module.exports = function (tree) {

var Comment = function (value, isLineComment, index, currentFileInfo) {
    this.value = value;
    this.isLineComment = isLineComment;
    this.currentFileInfo = currentFileInfo;
};
Comment.prototype = {
    type: "Comment",
    genCSS: function (env, output) {
        if (this.debugInfo) {
            output.add(tree.debugInfo(env, this), this.currentFileInfo, this.index);
        }
        output.add(this.value);
    },
    toCSS: tree.toCSS,
    isSilent: function(env) {
        var isReference = (this.currentFileInfo && this.currentFileInfo.reference && !this.isReferenced),
            isCompressed = env.compress && this.value[2] !== "!";
        return this.isLineComment || isReference || isCompressed;
    },
    eval: function () { return this; },
    markReferenced: function () {
        this.isReferenced = true;
    }
};
return Comment;
};
