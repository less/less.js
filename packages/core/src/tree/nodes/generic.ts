import Node, { ILocationInfo, IProps } from '../node'

type IGenericProps = string | IProps
/**
 * Generic is any generic (string) value, assigned to the text property
 *   e.g. new Generic('this is an unquoted value')
 * 
 * Renamed from 'Anonymous'
 */
class Generic extends Node {
  constructor(props: IGenericProps, location: ILocationInfo) {
    if (props.constructor === String) {
      props = <IProps>{ text: <string>props }
    }
    super(<IProps>props, location)
  }
}
Generic.prototype.type = 'Generic'
export default Generic
