import Node from '../node'
import NumericNode from '../numeric-node'
import Color from './color'
import Dimension from './dimension'
import NumberValue from './number-value'
import Value from './value'
import { operate } from '../util'
import { MathMode } from '../../constants'
import { EvalContext } from '../../contexts'

/**
 * Values can only be 3 Nodes
 *   e.g. [Value, Value, Value]
 *        [Operation, Value, Value]
 */
class Operation extends Node {
  /**
   * Represents lhs, op, rhs
   */
  nodes: [Node, Value, Node]

  eval(context: EvalContext) {
    super.eval(context)

    const nodes = this.nodes
    let a = nodes[0]
    let b = nodes[2]
    let op = nodes[1].value

    if (context.isMathOn(op)) {
      op = op === './' ? '/' : op

      if (a instanceof NumericNode) {
        return a.operate(op, b, context)
      } else {
        if (a instanceof Operation && op === '/' && context.options.math === MathMode.NO_DIVISION) {
          return new Operation([a, nodes[1], b], this.options, this.location)
        }
        return this.error(context, 'Operation on an invalid type')
      }
    } else {
      return this
    }
  }
}

Operation.prototype.type = 'Operation';
export default Operation;
