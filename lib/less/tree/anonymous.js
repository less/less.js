module.exports = function (tree) {

var Anonymous = function (string, index, currentFileInfo, mapLines) {
    this.value = string.value || string;
    this.index = index;
    this.mapLines = mapLines;
    this.currentFileInfo = currentFileInfo;
};
Anonymous.prototype = {
    type: "Anonymous",
    eval: function () {
        return new Anonymous(this.value, this.index, this.currentFileInfo, this.mapLines);
    },
    compare: function (x) {
        if (!x.toCSS) {
            return -1;
        }

        var left = this.toCSS(),
            right = x.toCSS();

        if (left === right) {
            return 0;
        }

        return left < right ? -1 : 1;
    },
    genCSS: function (env, output) {
        output.add(this.value, this.currentFileInfo, this.index, this.mapLines);
    },
    toCSS: tree.toCSS
};
return Anonymous;
};
