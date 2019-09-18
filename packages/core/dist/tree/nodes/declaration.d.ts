import Node from '../node';
import { EvalContext } from '../../contexts';
/**
 * Will merge props using space or comma separators
 */
export declare enum MergeType {
    SPACED = 0,
    COMMA = 1
}
declare class Declaration extends Node {
    children: {
        name: Node[];
        value: Node[];
        important: Node[];
    };
    options: {
        isVariable?: boolean;
        mergeType?: MergeType;
    };
    eval(context: EvalContext): any;
    makeImportant(): any;
}
export default Declaration;
