import Node, { ILocationInfo, ISimpleProps, IProps, INodeOptions } from '../node'

type IValueProps = string | {
  /** Normalized value */
  value: string
  /** Actual text value */
  text: string
}
/**
 * This is any generic (unquoted string fragment) value
 *   e.g. new Value('this is an unquoted value')
 *        new Value({ text: '[id=foo]', value: '[id="foo"]' }) */
 //       new Value({ text: ' >/* combine */ ', value: '>' })
 /* 
 * Renamed from 'Anonymous'
 */
class Value extends Node {
  text: string
  value: string

  constructor(props: IValueProps, options?: INodeOptions, location?: ILocationInfo) {
    let returnProps: ISimpleProps
    if (props.constructor === String) {
      returnProps = <ISimpleProps>{ text: <string>props, value: <string>props }
    } else {
      returnProps = <ISimpleProps>props
      if (returnProps.value === undefined) {
        returnProps.value = returnProps.text
      }
    }
    super(<IProps>returnProps, options, location)
  }
}
Value.prototype.type = 'Value'
export default Value
