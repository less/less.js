import Node, { IProps, ILocationInfo } from '../node'

type INumericProps = number | IProps
/**
 * Numeric is any number (dimension without a unit)
 *   e.g. new Numeric(2, ...)
 */
class Numeric extends Node {
  constructor(props: INumericProps, location: ILocationInfo) {
    if (props.constructor === Number) {
      props = <IProps>{ primitive: <number>props }
    }
    super(<IProps>props, location)
  }
}
Numeric.prototype.type = 'Numeric'
export default Numeric
