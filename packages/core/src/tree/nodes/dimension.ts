import {
  Node,
  IProps,
  INodeOptions,
  ILocationInfo,
  NumericNode,
  NumberValue,
  Value
} from '.'

import { convertDimension } from '../util/convert'
import { EvalContext } from '../contexts'
import { operate } from '../util/math'
import { StrictUnitMode } from '../../constants'

export type IDimensionProps = [number | NumberValue, string | Value] | IProps

/**
 * A number with a unit
 * 
 * e.g. props = [<NumberValue>, <Value>], or
 *      props = [1, 'px']
 */
export class Dimension extends NumericNode {
  value: number
  /** Second value is the unit */
  nodes: [NumberValue, Value]

  constructor(props: IDimensionProps, options?: INodeOptions, location?: ILocationInfo) {
    let nodes = Array(2)

    if (Array.isArray(props)) {
      const val1 = props[0]
      const val2 = props[1]
      nodes[0] = val1.constructor === Number ? new NumberValue(<number>val1) : <NumberValue>val1
      nodes[1] = val2.constructor === String ? new Value(<string>val2) : <Value>val2
      props = { nodes }
    }
    super(props, options, location)
    /** Sets the value to the value of the NumberValue */
    this.value = this.nodes[0].value
  }

  operate(op: string, other: Node, context: EvalContext): Node {
    const strictUnits = context.options.strictUnits
    if (other instanceof Dimension) {
      const aUnit = this.nodes[1]
      const bNode = this.unify(other, aUnit.value)
      const bUnit = bNode.nodes[1]

      if (aUnit.value !== bUnit.value) {
        if (strictUnits === StrictUnitMode.ERROR) {
          return this.error(
            context,
            `Incompatible units. Change the units or use the unit function. ` + 
              `Bad units: '${aUnit.value}' and '${bUnit.value}'.`
          )
        } else if (strictUnits === StrictUnitMode.LOOSE) {
          /**
           * In an operation between two Dimensions,
           * we default to the first Dimension's unit,
           * so `1px + 2%` will yield `3px`.
           * 
           * This can have un-intuitive behavior for a user,
           * so it is not a recommended setting.
           */
          const result = operate(op, this.value, bNode.value)
          return new Dimension([result, aUnit.clone()]).inherit(this)
        } else {
          return this.warn(
            context,
            `Incompatible units. Operation will be preserved.`
          )
        }
      } else {
        const result = operate(op, this.value, bNode.value)
        /** Dividing 8px / 1px will yield 8 */
        if (op === '/') {
          return new NumberValue(result).inherit(this)
        } else if (op === '*') {
          return this.error(context, `Can't multiply a unit by a unit.`)
        }
        return new Dimension([result, aUnit.clone()]).inherit(this)
      }
    } else if (other instanceof NumberValue) {
      const unit = this.nodes[1].clone()
      const result = operate(op, this.nodes[0].value, other.value)
      return new Dimension([result, unit.clone()]).inherit(this)
    }
    return this
  }

  unify(other: Dimension, unit: string) {
    const newDimension = convertDimension(other, unit)
    if (newDimension) {
      return newDimension
    }
    return other
  }
}

Dimension.prototype.type = 'Dimension'
