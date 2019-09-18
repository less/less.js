import Node from '../node';
import Selector from './selector';
import List from './list';
/**
 * A Ruleset is a generic object in Less
 *
 * It can have selectors, arguments, a set of rule nodes (as rules), and a guard
 *
 * e.g.
 *      1. a plain qualified CSS rule [a {b: c}] will have selectors and rules
 *      2. a mixin will have selectors, args, rules, and possibly a guard
 *      3. A variable can be attached to a ruleset, which will then have no selectors, but can have args
 *
 *  Rules also define a new scope object for variables and functions
 */
declare class Ruleset extends Node {
    children: {
        selectors: [List<Selector>];
        rules: Node[];
    };
    eval(context: any): any;
    evalImports(context: any): void;
    makeImportant(): any;
    matchArgs(args: any): boolean;
    matchCondition(args: any, context: any): boolean;
    resetCache(): void;
    variables(): any;
    properties(): any;
    variable(name: any): any;
    property(name: any): any;
    lastDeclaration(): any;
    parseValue(toParse: any): any;
    rulesets(): any[];
    prependRule(rule: any): void;
    find(selector: any, self: this, filter: any): any;
    genCSS(context: any, output: any): void;
    joinSelectors(paths: any, context: any, selectors: any): void;
    joinSelector(paths: any, context: any, selector: any): void;
}
export default Ruleset;
