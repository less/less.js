var Node = require("./node"),
    Variable = require("./variable");

var VariableCall = function (variable) {
    this.variable = variable;
    this.allowRoot = true;
};
VariableCall.prototype = new Node();
VariableCall.prototype.type = "VariableCall";
VariableCall.prototype.eval = function (context) {
    var detachedRuleset = new Variable(this.variable).eval(context);
    return detachedRuleset.callEval(context);
};
module.exports = VariableCall;
