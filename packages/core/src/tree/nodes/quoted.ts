import Node, { IProps, ILocationInfo } from '../node'
import Variable from './variable'
import Property from './property-ref'
import { primitiveCompare } from '../util/math'

type IQuotedOptions = {
  escaped?: boolean
}

/**
 * There's nothing special about a quoted node, other than
 * the first and last member will contain quote marks
 *   e.g. <Quoted <Value ">, <Value foo>, <Value ">>
 * 
 * If interpolated vars are present, the middle value will be an expression, as in:
 *   e.g. <Quoted <Value ">, <Expression <Value foo>, <Variable @bar>>, <Value "> >
 * 
 *   1) it may contain interpolated vars
 *   2) we can do normalized equality checks with the "inner" nodes
 */
class Quoted extends Node {
  nodes: [Node, Node, Node]

  constructor(props: IProps, options: IQuotedOptions = {}, location?: ILocationInfo) {
    if (options.escaped === undefined) {
      options.escaped = false
    }
    super(props, options, location)
    this.allowRoot = options.escaped
  }

  valueOf() {
    return this.nodes[1].toString()
  }
}

Quoted.prototype.type = 'Quoted';
export default Quoted;
