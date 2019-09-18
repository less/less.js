import Node from '../node';
import { EvalContext } from '../../contexts';
declare type IExpressionOptions = {
    inBlock: boolean;
    blockInOp: boolean;
};
/**
 * An expression is a value that collapses blocks after evaluation
 */
declare class Expression extends Node {
    options: IExpressionOptions;
    eval(context: EvalContext): any;
    throwAwayComments(): void;
}
export default Expression;
