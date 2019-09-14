import Node, { ISimpleProps, ILocationInfo, IRootOptions } from '../node'
import Paren from './paren'
import Comment from './comment'
import Dimension from './dimension'
import { EvalContext } from '../../contexts'
import { MathMode } from '../../constants'

type IExpressionOptions = {
  inBlock: boolean
  blockInOp: boolean
}

/**
 * An expression is a value that collapses blocks after evaluation
 */
class Expression extends Node {
  options: IExpressionOptions
  constructor(props: ISimpleProps, location: ILocationInfo, opts: IExpressionOptions) {
    super(props, location, opts)
  }
  eval(context: EvalContext) {
    const { inBlock, blockInOp } = this.options
    let returnValue: any
    const mathOn = context.isMathOn()

    const inParenthesis = inBlock && 
      (context.options.math !== MathMode.STRICT_LEGACY || !blockInOp)

    let doubleParen = false
    if (inParenthesis) {
      context.enterBlock()
    }
    if (this.value.length > 1) {
      returnValue = super.eval(context)
    } else if (this.value.length === 1) {
      const value = this.value[0]
      if (
        value instanceof Expression && 
        value.options.inBlock &&
        value.options.blockInOp &&
        !context.inCalc
      ) {
        doubleParen = true
      }
      returnValue = value.eval(context)
    } else {
      returnValue = this
    }
    if (inParenthesis) {
      context.exitBlock()
    }
    if (inBlock && blockInOp && !mathOn && !doubleParen 
      && (!(returnValue instanceof Dimension))) {
      returnValue = new Paren(returnValue)
    }
    return returnValue
  }

  throwAwayComments() {
    this.value = this.value.filter(v => !(v instanceof Comment));
  }
}

Expression.prototype.type = 'Expression';
export default Expression;
