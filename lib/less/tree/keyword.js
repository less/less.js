var Node = require("./node.js");

var Keyword = function (value) { this.value = value; };
Keyword.prototype = new Node();
Keyword.prototype.type = "Keyword";
Keyword.prototype.genCSS = function (env, output) {
    if (this.value === '%') { throw { type: "Syntax", message: "Invalid % without number" }; }
    output.add(this.value);
};
Keyword.prototype.compare = function (other) {
    if (other instanceof Keyword) {
        return other.value === this.value ? 0 : 1;
    } else {
        return -1;
    }
};

Keyword.True = new(Keyword)('true');
Keyword.False = new(Keyword)('false');

module.exports = Keyword;
