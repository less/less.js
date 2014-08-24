var Node = require("./node.js"),
    contexts = require("../env.js");

var DetachedRuleset = function (ruleset, frames) {
    this.ruleset = ruleset;
    this.frames = frames;
};
DetachedRuleset.prototype = new Node();
DetachedRuleset.prototype.type = "DetachedRuleset";
DetachedRuleset.prototype.evalFirst = true;
DetachedRuleset.prototype.accept = function (visitor) {
    this.ruleset = visitor.visit(this.ruleset);
};
DetachedRuleset.prototype.eval = function (env) {
    var frames = this.frames || env.frames.slice(0);
    return new DetachedRuleset(this.ruleset, frames);
};
DetachedRuleset.prototype.callEval = function (env) {
    return this.ruleset.eval(this.frames ? new(contexts.evalEnv)(env, this.frames.concat(env.frames)) : env);
};
module.exports = DetachedRuleset;
