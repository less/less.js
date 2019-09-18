import AtRule from './atrule';
declare class Media extends AtRule {
    constructor(value: any, features: any, index: any, currentFileInfo: any, visibilityInfo: any);
    isRulesetLike(): boolean;
    accept(visitor: any): void;
    genCSS(context: any, output: any): void;
    eval(context: any): any;
    evalTop(context: any): this;
    evalNested(context: any): any;
    permute(arr: any): any;
    bubbleSelectors(selectors: any): void;
}
export default Media;
