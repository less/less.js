import {
  Node,
  ILocationInfo,
  IProps,
  INodeOptions,
  NumericNode,
  Dimension,
  Color
} from '.'

import { EvalContext } from 'core/src/tree/contexts'
import { operate } from '../util/math'

export type INumberProps = number | IProps
/**
 * A NumberValue is any number (dimension without a unit)
 *   e.g. new NumberValue(2, ...)
 * 
 * @todo - does this need to store the text representation?
 *   e.g. a CSS number can be '+1', the plus would be lost in conversion
 */
export class NumberValue extends NumericNode {
  value: number
  constructor(props: INumberProps, options?: INodeOptions, location?: ILocationInfo) {
    if (props.constructor === Number) {
      props = <IProps>{ value: <number>props }
    }
    super(<IProps>props, options, location)
  }

  valueOf(): number {
    return <number>super.valueOf()
  }

  /** @todo */
  operate(op: string, other: Node, context?: EvalContext) {
    if (other instanceof NumericNode) {
      if (!(other instanceof NumberValue)) {
        if (op === '/') {
          return this.error(context, `Can't divide a number by a non-number.`)
        }
        /** 8 - 2px */
        if (op === '-') {
          const node = other.operate(op, this)
          if (node instanceof Dimension) {
            const newValue = node.value * -1
            node.value = newValue
            node.nodes[0].value = newValue
          } else if (node instanceof Color) {
            (<number[]>node.value).forEach((val, i) => {
              if (i < 3) {
                node.value[i] = node.value[i] * -1
              }
            })
          }
          return node
        } else {
          return other.operate(op, this)
        }
      } else {
        return new NumberValue(operate(op, this.valueOf(), other.valueOf()), this.options, this.location)
      }
    }
    return this
  }
}
NumberValue.prototype.type = 'NumberValue'
