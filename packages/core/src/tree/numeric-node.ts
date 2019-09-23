import { Node } from './nodes'
import { EvalContext } from './contexts'

/**
 * Numeric nodes can be used in math expressions
 */
export abstract class NumericNode extends Node {
  abstract operate(op: string, other: Node, context?: EvalContext): Node
}