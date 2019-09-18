import Node from '../node';
declare class FunctionCall extends Node {
    constructor(name: any, args: any, index: any, currentFileInfo: any);
    accept(visitor: any): void;
    eval(context: any): any;
    genCSS(context: any, output: any): void;
}
export default FunctionCall;
