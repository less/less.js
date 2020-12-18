import Node from './node';
import Variable from './variable';
import Ruleset from './ruleset';
import DetachedRuleset from './detached-ruleset';
import LessError from '../less-error';

const VariableCall = function(variable, index, currentFileInfo) {
    this.variable = variable;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.allowRoot = true;
};

VariableCall.prototype = Object.assign(new Node(), {
    type: 'VariableCall',

    eval(context) {
        let rules;
        let detachedRuleset = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context);
        const error = new LessError({message: `Could not evaluate variable call ${this.variable}`});

        if (!detachedRuleset.ruleset) {
            if (detachedRuleset.rules) {
                rules = detachedRuleset;
            }
            else if (Array.isArray(detachedRuleset)) {
                rules = new Ruleset('', detachedRuleset);
            }
            else if (Array.isArray(detachedRuleset.value)) {
                rules = new Ruleset('', detachedRuleset.value);
            }
            else {
                throw error;
            }
            detachedRuleset = new DetachedRuleset(rules);
        }

        if (detachedRuleset.ruleset) {
            return detachedRuleset.callEval(context);
        }
        throw error;
    }
});

export default VariableCall;
