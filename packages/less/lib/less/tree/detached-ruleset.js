// @ts-check
/** @import { EvalContext, TreeVisitor } from './node.js' */
import Node from './node.js';
import contexts from '../contexts.js';
import * as utils from '../utils.js';

class DetachedRuleset extends Node {
    get type() { return 'DetachedRuleset'; }

    /**
     * @param {Node} ruleset
     * @param {Node[]} [frames]
     */
    constructor(ruleset, frames) {
        super();
        this.ruleset = ruleset;
        this.frames = frames;
        this.evalFirst = true;
        this.setParent(this.ruleset, this);
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.ruleset = visitor.visit(this.ruleset);
    }

    /**
     * @param {EvalContext} context
     * @returns {DetachedRuleset}
     */
    eval(context) {
        const frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRuleset(this.ruleset, frames);
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    callEval(context) {
        return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
    }
}

export default DetachedRuleset;
