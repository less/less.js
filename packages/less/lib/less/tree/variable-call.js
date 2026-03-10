import Node from './node.js';
import Variable from './variable.js';
import Ruleset from './ruleset.js';
import DetachedRuleset from './detached-ruleset.js';
import LessError from '../less-error.js';

class VariableCall extends Node {
    get type() { return 'VariableCall'; }

    constructor(variable, index, currentFileInfo) {
        super();
        this.variable = variable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
    }

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
}

export default VariableCall;
