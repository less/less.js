import Node from '../node';
declare class Import extends Node {
    constructor(path: any, features: any, options: any, index: any, currentFileInfo: any, visibilityInfo: any);
    accept(visitor: any): void;
    genCSS(context: any, output: any): void;
    getPath(): any;
    isVariableImport(): any;
    evalForImport(context: any): Import;
    evalPath(context: any): any;
    eval(context: any): any;
    doEval(context: any): any;
}
export default Import;
