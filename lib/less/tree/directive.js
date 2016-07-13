// Backwards compatibility shim for Directive (AtRule)
var AtRule = require("./atrule");

var Directive = function () {
    var args = Array.prototype.slice.call(arguments);
    AtRule.apply(this, args);
};

Directive.prototype = Object.create(AtRule.prototype);
Directive.prototype.constructor = Directive;

module.exports = Directive;