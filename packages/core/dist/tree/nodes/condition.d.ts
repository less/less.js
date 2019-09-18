import Node from '../node';
declare class Condition extends Node {
    constructor(op: any, l: any, r: any, i: any, negate: any);
    accept(visitor: any): void;
    eval(context: any): any;
}
export default Condition;
