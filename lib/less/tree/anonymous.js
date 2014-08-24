var Node = require("./node.js");

var Anonymous = function (value, index, currentFileInfo, mapLines, rulesetLike) {
    this.value = value;
    this.index = index;
    this.mapLines = mapLines;
    this.currentFileInfo = currentFileInfo;
    this.rulesetLike = (typeof rulesetLike === 'undefined')? false : rulesetLike;
};
Anonymous.prototype = new Node();
Anonymous.prototype.type = "Anonymous";
Anonymous.prototype.eval = function () {
    return new Anonymous(this.value, this.index, this.currentFileInfo, this.mapLines, this.rulesetLike);
};
Anonymous.prototype.compare = function (x) {
    if (!x.toCSS) {
        return -1;
    }

    var left = this.toCSS(),
        right = x.toCSS();

    if (left === right) {
        return 0;
    }

    return left < right ? -1 : 1;
};
Anonymous.prototype.isRulesetLike = function() {
    return this.rulesetLike;
};
Anonymous.prototype.genCSS = function (env, output) {
    output.add(this.value, this.currentFileInfo, this.index, this.mapLines);
};
module.exports = Anonymous;
