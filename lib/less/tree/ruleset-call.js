module.exports = function (tree) {

var RulesetCall = function (variable) {
    this.variable = variable;
};
RulesetCall.prototype = {
    type: "RulesetCall",
    accept: function (visitor) {
    },
    eval: function (env) {
        var detachedRuleset = new(tree.Variable)(this.variable).eval(env);
        return detachedRuleset.callEval(env);
    }
};
return RulesetCall;
};
