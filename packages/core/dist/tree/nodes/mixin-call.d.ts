import Node from '../node';
declare class MixinCall extends Node {
    constructor(elements: any, args: any, index: any, currentFileInfo: any, important: any);
    accept(visitor: any): void;
    eval(context: any): any[];
    _setVisibilityToReplacement(replacement: any): void;
    format(args: any): string;
}
export default MixinCall;
