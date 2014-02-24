module.exports = function (tree) {

var UnicodeDescriptor = function (value) {
    this.value = value;
};
UnicodeDescriptor.prototype = {
    type: "UnicodeDescriptor",
    genCSS: function (env, output) {
        output.add(this.value);
    },
    toCSS: tree.toCSS,
    eval: function () { return this; }
};
return UnicodeDescriptor;
};
