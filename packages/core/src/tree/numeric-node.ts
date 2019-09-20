import Node from './node'
import { EvalContext } from '../contexts'

/**
 * Numeric nodes can be used in math expressions
 */
export default abstract class NumericNode extends Node {
  abstract operate(op: string, other: Node, context?: EvalContext): Node
}