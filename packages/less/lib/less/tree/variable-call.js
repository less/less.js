// @ts-check
/** @import { EvalContext, FileInfo } from './node.js' */
import Node from './node.js';
import Variable from './variable.js';
import Ruleset from './ruleset.js';
import DetachedRuleset from './detached-ruleset.js';
import LessError from '../less-error.js';

class VariableCall extends Node {
    get type() { return 'VariableCall'; }

    /**
     * @param {string} variable
     * @param {number} index
     * @param {FileInfo} currentFileInfo
     */
    constructor(variable, index, currentFileInfo) {
        super();
        this.variable = variable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        let rules;
        /** @type {DetachedRuleset | Node} */
        let detachedRuleset = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context);
        const error = new LessError({message: `Could not evaluate variable call ${this.variable}`});

        if (!(/** @type {DetachedRuleset} */ (detachedRuleset)).ruleset) {
            const dr = /** @type {Node & { rules?: Node[] }} */ (detachedRuleset);
            if (dr.rules) {
                rules = detachedRuleset;
            }
            else if (Array.isArray(detachedRuleset)) {
                rules = new Ruleset(null, detachedRuleset);
            }
            else if (Array.isArray(detachedRuleset.value)) {
                rules = new Ruleset(null, detachedRuleset.value);
            }
            else {
                throw error;
            }
            detachedRuleset = new DetachedRuleset(rules);
        }

        const dr = /** @type {DetachedRuleset} */ (detachedRuleset);
        if (dr.ruleset) {
            return dr.callEval(context);
        }
        throw error;
    }
}

export default VariableCall;
