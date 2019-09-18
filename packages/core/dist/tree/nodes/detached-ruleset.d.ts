import Node from '../node';
/**
 * @todo - remove and merge with ruleset
 */
declare class DetachedRuleset extends Node {
    constructor(ruleset: any, frames: any);
    accept(visitor: any): void;
    eval(context: any): DetachedRuleset;
    callEval(context: any): any;
}
export default DetachedRuleset;
