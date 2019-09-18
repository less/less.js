import Node from '../node';
declare class Extend extends Node {
    constructor(selector: any, option: any, index: any, currentFileInfo: any, visibilityInfo: any);
    accept(visitor: any): void;
    eval(context: any): Extend;
    clone(context: any): Extend;
    findSelfSelectors(selectors: any): void;
}
export default Extend;
