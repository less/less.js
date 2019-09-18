import Node from '../node';
declare class VariableCall extends Node {
    constructor(variable: any, index: any, currentFileInfo: any);
    eval(context: any): any;
}
export default VariableCall;
