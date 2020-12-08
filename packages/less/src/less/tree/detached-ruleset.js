import Node from './node';
import contexts from '../contexts';
import * as utils from '../utils';

const DetachedRuleset = function(ruleset, frames) {
    this.ruleset = ruleset;
    this.frames = frames;
    this.setParent(this.ruleset, this);
};

DetachedRuleset.prototype = new Node();

DetachedRuleset.prototype.accept = function(visitor) {
    this.ruleset = visitor.visit(this.ruleset);
};

DetachedRuleset.prototype.eval = function(context) {
    const frames = this.frames || utils.copyArray(context.frames);
    return new DetachedRuleset(this.ruleset, frames);
};

DetachedRuleset.prototype.callEval = function(context) {
    return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
};

DetachedRuleset.prototype.type = 'DetachedRuleset';
DetachedRuleset.prototype.evalFirst = true;
export default DetachedRuleset;
