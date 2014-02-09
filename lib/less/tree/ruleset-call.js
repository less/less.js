(function (tree) {

tree.RulesetCall = function (variable) {
    this.variable = variable;
};
tree.RulesetCall.prototype = {
    type: "RulesetCall",
    accept: function (visitor) {
    },
    eval: function (env) {
        return new(tree.Variable)(this.variable).eval(env);
    }
};

})(require('../tree'));
