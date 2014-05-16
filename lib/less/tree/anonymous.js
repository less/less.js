(function (tree) {

tree.Anonymous = function (value, index, currentFileInfo, mapLines, rulesetLike) {
    this.value = value;
    this.index = index;
    this.mapLines = mapLines;
    this.currentFileInfo = currentFileInfo;
    this.rulesetLike = (typeof rulesetLike === 'undefined')? false : rulesetLike;
};
tree.Anonymous.prototype = {
    type: "Anonymous",
    eval: function () { 
        return new tree.Anonymous(this.value, this.index, this.currentFileInfo, this.mapLines, this.rulesetLike);
    },
    compare: function (other) {
        return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    },
    isRulesetLike: function() {
        return this.rulesetLike;
    },
    genCSS: function (env, output) {
        output.add(this.value, this.currentFileInfo, this.index, this.mapLines);
    },
    toCSS: tree.toCSS
};

})(require('../tree'));
