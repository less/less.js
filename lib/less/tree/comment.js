(function (tree) {

tree.Comment = function (value, silent, index, currentFileInfo) {
    this.value = value;
    this.silent = !!silent;
    this.currentFileInfo = currentFileInfo;
};
tree.Comment.prototype = {
    type: "Comment",
    toCSS: function (env) {
        return (env.compress || (this.currentFileInfo && this.currentFileInfo.mute && !this.isNotMute)) ? '' : this.value;
    },
    eval: function () { return this; },
    markNotMute: function () {
        this.isNotMute = true;
    }
};

})(require('../tree'));
