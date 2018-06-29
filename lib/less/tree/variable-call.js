var Node = require('./node'),
    Variable = require('./variable'),
    Ruleset = require('./ruleset'),
    DetachedRuleset = require('./detached-ruleset'),
    LessError = require('../less-error');

var VariableCall = function (variable, index, currentFileInfo) {
    this.variable = variable;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.allowRoot = true;
};
VariableCall.prototype = new Node();
VariableCall.prototype.type = 'VariableCall';
VariableCall.prototype.eval = function (context) {
    var detachedRuleset = new Variable(this.variable).eval(context);
    if (!detachedRuleset.ruleset &&
        Array.isArray(detachedRuleset.value)) {
        
        detachedRuleset = new DetachedRuleset(new Ruleset('', detachedRuleset.value));
    }
    if (detachedRuleset.ruleset) {
        return detachedRuleset.callEval(context);
    }
    else {
        throw new LessError({message: 'Could not evaluate variable call ' + this.variable});
    }
};
module.exports = VariableCall;
