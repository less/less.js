var Node = require("./node");

var Combinator = function (value) {
    if (value === ' ') {
        this.value = ' ';
    } else {
        this.value = value ? value.trim() : "";
    }
};
Combinator.prototype = new Node();
Combinator.prototype.type = "Combinator";
var _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};
Combinator.prototype.genCSS = function (env, output) {
    var spaceOrEmpty = (env.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
    output.add(spaceOrEmpty + this.value + spaceOrEmpty);
};
module.exports = Combinator;
