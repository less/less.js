import Node, { ILocationInfo, IProps } from '../node'

type IAnyProps = string | IProps
/**
 * Any is any generic (string) value, assigned to the text property
 *   e.g. new Any('this is an unquoted value')
 * 
 * Renamed from 'Anonymous'
 */
class Any extends Node {
  constructor(props: IAnyProps, location: ILocationInfo) {
    if (props.constructor === String) {
      props = <IProps>{ text: <string>props }
    }
    super(<IProps>props, location)
  }
}
Any.prototype.type = 'Any'
export default Any
