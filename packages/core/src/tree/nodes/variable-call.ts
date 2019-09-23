import {
  Node,
  Variable,
  Rules,
  DetachedRules
} from '.'

import LessError from '../less-error';

export class VariableCall extends Node {
    constructor(variable, index, currentFileInfo) {
        super();

        this.variable = variable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
    }

    eval(context) {
        let rules;
        let detachedRules = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context);
        const error = new LessError({message: `Could not evaluate variable call ${this.variable}`});

        if (!detachedRules.rules) {
            if (detachedRules.rules) {
                rules = detachedRules;
            }
            else if (Array.isArray(detachedRules)) {
                rules = new Rules('', detachedRules);
            }
            else if (Array.isArray(detachedRules.value)) {
                rules = new Rules('', detachedRules.value);
            }
            else {
                throw error;
            }
            detachedRules = new DetachedRules(rules);
        }

        if (detachedRules.rules) {
            return detachedRules.callEval(context);
        }
        throw error;
    }
}

VariableCall.prototype.type = 'VariableCall'
