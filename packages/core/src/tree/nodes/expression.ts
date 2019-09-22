import Node from '../node'
import Block from './block'
import Comment from './comment'
import WS from './ws'
import Dimension from './dimension'
import { EvalContext } from '../../contexts'
import { MathMode } from '../../constants'

type IExpressionOptions = {
  inBlock: boolean
  blockInOp: boolean
}

/**
 * An expression is an arbitrary list of nodes,
 * but has two unique properties:
 *   1) It switches the way math is evaluated based on blocks
 *   2) When converted to an array, it discards whitespace and 
 *      comments as members of the array.
 */
class Expression extends Node {
  options: IExpressionOptions

  // toArray() {
  //   return this.nodes.filter(node =>
  //     (!(node instanceof WS) && !(node instanceof Comment))
  //   )
  // }

  /**
   * @todo - why not just do enter / exit block in the block node?
   */
  eval(context: EvalContext) {
    const { inBlock, blockInOp } = this.options
    let returnValue: any
    const mathOn = context.isMathOn()

    const inParenthesis = inBlock && !blockInOp

    let doubleParen = false
    if (inParenthesis) {
      context.enterBlock()
    }
    if (this.nodes.length > 1) {
      returnValue = super.eval(context)
    } else if (this.nodes.length === 1) {
      const value = this.nodes[0]
      if (
        value instanceof Expression && 
        value.options.inBlock &&
        value.options.blockInOp &&
        !context.inCalc
      ) {
        doubleParen = true
      }
      returnValue = value.eval(context).inherit(this)
    } else {
      returnValue = this
    }
    if (inParenthesis) {
      context.exitBlock()
    }
    if (inBlock && blockInOp && !mathOn && !doubleParen 
      && (!(returnValue instanceof Dimension))) {
      returnValue = new Block(returnValue, {}, this.location).inherit(this)
    }
    return returnValue
  }

  throwAwayComments() {
    this.nodes = this.nodes.filter(v => !(v instanceof Comment));
  }
}

Expression.prototype.type = 'Expression';
export default Expression;
