var Node = require("./node"),
    Variable = require("./variable");

var RulesetCall = function (variable) {
    this.variable = variable;
};
RulesetCall.prototype = new Node();
RulesetCall.prototype.type = "RulesetCall";
RulesetCall.prototype.eval = function (env) {
    var detachedRuleset = new(Variable)(this.variable).eval(env);
    return detachedRuleset.callEval(env);
};
module.exports = RulesetCall;
