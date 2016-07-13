// Backwards compatibility shim for Rule (Declaration)
var Declaration = require("./declaration");

var Rule = function () {
    var args = Array.prototype.slice.call(arguments);
    Declaration.apply(this, args);
};

Rule.prototype = Object.create(Declaration.prototype);
Rule.prototype.constructor = Rule;

module.exports = Rule;