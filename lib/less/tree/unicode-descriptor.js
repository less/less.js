var Node = require("./node.js");

var UnicodeDescriptor = function (value) {
    this.value = value;
};
UnicodeDescriptor.prototype = new Node();
UnicodeDescriptor.prototype.type = "UnicodeDescriptor";

module.exports = UnicodeDescriptor;
