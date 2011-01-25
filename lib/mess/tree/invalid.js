(function (tree) {

var sys = require('sys');

tree.Invalid = function Invalid(chunk, index) {
    this.chunk = chunk;
    this.index = index;
    this.message = "Invalid code: " + this.chunk;
};
})(require('mess/tree'));
