import Ruleset from './ruleset';
declare class Definition extends Ruleset {
    constructor(name: any, params: any, rules: any, condition: any, variadic: any, frames: any, visibilityInfo: any);
    accept(visitor: any): void;
    evalParams(context: any, mixinEnv: any, args: any, evaldArguments: any): Ruleset;
    makeImportant(): any;
    eval(context: any): any;
    evalCall(context: any, args: any, important: any): any;
    matchCondition(args: any, context: any): boolean;
    matchArgs(args: any, context: any): boolean;
}
export default Definition;
