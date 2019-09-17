import Node, { ILocationInfo, IProps, INodeOptions } from '../node'

type IGenericProps = string | IProps
/**
 * Generic is any generic (string) value, assigned to the text property
 *   e.g. new Generic('this is an unquoted value')
 * 
 * Renamed from 'Anonymous'
 */
class Generic extends Node {
  constructor(props: IGenericProps, options?: INodeOptions, location?: ILocationInfo) {
    if (props.constructor === String) {
      props = <IProps>{ text: <string>props }
    }
    super(<IProps>props, options, location)
  }
}
Generic.prototype.type = 'Generic'
export default Generic
