import Node from '../node';
declare class Operation extends Node {
    constructor(op: any, operands: any, isSpaced: any);
    accept(visitor: any): void;
    eval(context: any): any;
    genCSS(context: any, output: any): void;
}
export default Operation;
