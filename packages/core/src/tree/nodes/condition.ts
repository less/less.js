import Node, { IProps, ILocationInfo, IObjectProps } from '../node'
import Value from './value'
import { EvalContext } from '../contexts'
import { compare } from '../util/compare'
import Bool from './bool'

export type IConditionOptions = {
  negate: boolean
}

class Condition extends Node {
  /** [left, op, right] */
  nodes: [Node, Value, Node]
  options: IConditionOptions

  constructor(props: IProps, options: IConditionOptions, location: ILocationInfo) {
    super(props, options, location)
  }

  eval(context: EvalContext) {
    const result = ((op, a, b): boolean => {
      if (a instanceof Node && b instanceof Node) {
        switch (op) {
          case 'and': return a.valueOf() && b.valueOf()
          case 'or':  return a.valueOf() || b.valueOf()
          default:
            switch (compare(a, b)) {
              case -1:
                return op === '<' || op === '=<' || op === '<='
              case 0:
                return op === '=' || op === '>=' || op === '=<' || op === '<='
              case 1:
                return op === '>' || op === '>='
              default:
                return false
            }
        }
      } else {
        return false
      }
    })(this.nodes[1].value, this.nodes[0].eval(context), this.nodes[2].eval(context))

    const value = this.options.negate ? !result : result
    return new Bool(<IObjectProps>{ value })
  }
}

Condition.prototype.type = 'Condition';
export default Condition;