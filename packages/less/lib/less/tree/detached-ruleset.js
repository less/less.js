import Node from './node.js';
import contexts from '../contexts.js';
import * as utils from '../utils.js';

class DetachedRuleset extends Node {
    get type() { return 'DetachedRuleset'; }

    constructor(ruleset, frames) {
        super();
        this.ruleset = ruleset;
        this.frames = frames;
        this.evalFirst = true;
        this.setParent(this.ruleset, this);
    }

    accept(visitor) {
        this.ruleset = visitor.visit(this.ruleset);
    }

    eval(context) {
        const frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRuleset(this.ruleset, frames);
    }

    callEval(context) {
        return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
    }
}

export default DetachedRuleset;
