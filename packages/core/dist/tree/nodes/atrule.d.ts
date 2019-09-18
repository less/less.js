import Node, { ILocationInfo, INodeOptions } from '../node';
declare type IAtRuleProps = {
    name: string;
    /** Prelude */
    value?: Node[];
    /** Optional at-rule */
    rules?: Node[];
};
declare class AtRule extends Node {
    name: string;
    constructor(props: IAtRuleProps, options: INodeOptions, location: ILocationInfo);
    accept(visitor: any): void;
    isRulesetLike(): any;
    isCharset(): boolean;
    genCSS(context: any, output: any): void;
    eval(context: any): any;
    variable(name: any): any;
    find(...args: any[]): any;
    rulesets(): any;
    outputRuleset(context: any, output: any, rules: any): void;
}
export default AtRule;
