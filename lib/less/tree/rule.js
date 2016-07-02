// Backwards compatibility shim for Rule (Declaration)
var Declaration = require("./declaration");

var Rule = function () {
    var args = Array.prototype.slice.call(arguments);
    Declaration.call(this, args);
};

Rule.prototype = Object.create(Declaration.prototype);
Rule.prototype.constructor = Rule;
Rule.prototype.type = "Rule";

module.exports = Rule;