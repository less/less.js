import { Node } from '.'
import { EvalContext } from '../contexts'

/**
 * A () [] or {} block that holds an expression
 * Previously named 'Paren'
 * 
 * nodes will typically be [Value<'('>, Node, Value<')'>]
 */
export class Block extends Node {
  /** 
   * @todo - if block value was an operation, then
   *         we should return the result, not this block
   */
  eval(context: EvalContext) {
    context.enterBlock()
    const block = super.eval(context)
    context.exitBlock()
    return block
  }
}
Block.prototype.type = 'Block'
