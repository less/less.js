import { Node } from '.';
import { EvalContext } from '../contexts';
import * as utils from '../utils';

/**
 * @todo - remove and merge with rules
 */
class DetachedRules extends Node {
    constructor(rules, frames) {
        super();

        this.rules = rules;
        this.frames = frames;
        this.setParent(this.rules, this);
    }

    accept(visitor) {
        this.rules = visitor.visit(this.rules);
    }

    eval(context) {
        const frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRules(this.rules, frames);
    }

    callEval(context) {
        return this.rules.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
    }
}

DetachedRules.prototype.type = 'DetachedRules'
DetachedRules.prototype.evalFirst = true
