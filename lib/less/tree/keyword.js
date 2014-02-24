module.exports = function (tree) {

var Keyword = function (value) { this.value = value; };
Keyword.prototype = {
    type: "Keyword",
    eval: function () { return this; },
    genCSS: function (env, output) {
        if (this.value === '%') { throw { type: "Syntax", message: "Invalid % without number" }; }
        output.add(this.value);
    },
    toCSS: tree.toCSS,
    compare: function (other) {
        if (other instanceof Keyword) {
            return other.value === this.value ? 0 : 1;
        } else {
            return -1;
        }
    }
};

//TODO move?
tree.True = new(Keyword)('true');
tree.False = new(Keyword)('false');

return Keyword;

};
