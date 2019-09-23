import { Node, ILocationInfo, IProps, INodeOptions } from '.'

export type IValueProps = string | IProps
/**
 * This is any generic (unquoted string fragment) value
 *   e.g. new Value('this is an unquoted value')
 *        new Value({ text: '[id=foo]', value: '[id="foo"]' }) */
 //       new Value({ text: ' >/* combine */ ', value: '>' })
 /* 
 * Renamed from 'Anonymous'
 */
export class Value extends Node {
  text: string
  value: string

  constructor(props: IValueProps, options?: INodeOptions, location?: ILocationInfo) {
    let returnProps: IProps
    if (props.constructor === String) {
      returnProps = <IProps>{ text: <string>props, value: <string>props }
    } else {
      returnProps = <IProps>props
      if (returnProps.value === undefined) {
        returnProps.value = returnProps.text
      }
    }
    super(<IProps>returnProps, options, location)
  }
}
Value.prototype.type = 'Value'
