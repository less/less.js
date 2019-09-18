import Node, { ILocationInfo, IProps, ISimpleProps, INodeOptions } from '../node'

type INumericProps = number | IProps
/**
 * Numeric is any number (dimension without a unit)
 *   e.g. new Numeric(2, ...)
 * 
 * @todo - does this need to store the text representation?
 *   e.g. a CSS number can be '+1', the plus would be lost in conversion
 */
class Numeric extends Node {
  value: number
  constructor(props: INumericProps, options?: INodeOptions, location?: ILocationInfo) {
    if (props.constructor === Number) {
      props = <IProps>{ value: <number>props }
    }
    super(<IProps>props, options, location)
  }
}
Numeric.prototype.type = 'Numeric'
export default Numeric
