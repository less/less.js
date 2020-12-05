import Node from './node';
import contexts from '../contexts';
import * as utils from '../utils';

const DetachedRuleset = function(ruleset, frames) {
    this.ruleset = ruleset;
    this.frames = frames;
    this.setParent(this.ruleset, this);
};

DetachedRuleset.prototype = Object.assign(new Node(), {
    type: 'DetachedRuleset',
    evalFirst: true,

    accept(visitor) {
        this.ruleset = visitor.visit(this.ruleset);
    },

    eval(context) {
        const frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRuleset(this.ruleset, frames);
    },

    callEval(context) {
        return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
    }
});

export default DetachedRuleset;
