import Node from '../node';
declare class URL extends Node {
    constructor(val: any, index: any, currentFileInfo: any, isEvald: any);
    accept(visitor: any): void;
    genCSS(context: any, output: any): void;
    eval(context: any): URL;
}
export default URL;
