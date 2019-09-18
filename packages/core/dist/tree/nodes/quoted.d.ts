import Node from '../node';
/**
 * There's nothing special about a quoted node, other than
 * the first and last member are quote marks
 */
declare class Quoted extends Node {
    constructor(str: any, content: any, escaped: any, index: any, currentFileInfo: any);
    genCSS(context: any, output: any): void;
    containsVariables(): any;
    eval(context: any): Quoted;
    compare(other: any): any;
}
export default Quoted;
