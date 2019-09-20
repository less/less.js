import Node, { ILocationInfo, IProps, INodeOptions } from '../node'
import NumericNode from '../numeric-node'
import { EvalContext } from 'core/src/contexts'

type INumberProps = number | IProps
/**
 * A NumberValue is any number (dimension without a unit)
 *   e.g. new NumberValue(2, ...)
 * 
 * @todo - does this need to store the text representation?
 *   e.g. a CSS number can be '+1', the plus would be lost in conversion
 */
class NumberValue extends NumericNode {
  value: number
  constructor(props: INumberProps, options?: INodeOptions, location?: ILocationInfo) {
    if (props.constructor === Number) {
      props = <IProps>{ value: <number>props }
    }
    super(<IProps>props, options, location)
  }
  /** @todo */
  operate(op: string, other: Node) {
    return this
  }
}
NumberValue.prototype.type = 'NumberValue'
export default NumberValue
