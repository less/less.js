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
    var rules, detachedRuleset = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context),
        error = new LessError({message: 'Could not evaluate variable call ' + this.variable});

    if (!detachedRuleset.ruleset) {
        if (Array.isArray(detachedRuleset)) {
            rules = detachedRuleset;
        }
        else if (Array.isArray(detachedRuleset.value)) {
            rules = detachedRuleset.value;
        }
        else {
            throw error;
        }
        detachedRuleset = new DetachedRuleset(new Ruleset('', rules));
    }
    if (detachedRuleset.ruleset) {
        return detachedRuleset.callEval(context);
    }
    throw error;
};
module.exports = VariableCall;
