module.exports = function (tree) {

var Combinator = function (value) {
    if (value === ' ') {
        this.value = ' ';
    } else {
        this.value = value ? value.trim() : "";
    }
};
Combinator.prototype = {
    type: "Combinator",
    _noSpaceCombinators: {
        '': true,
        ' ': true,
        '|': true
    },
    genCSS: function (env, output) {
        var spaceOrEmpty = (env.compress || this._noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    },
    toCSS: tree.toCSS
};
return Combinator;
};
