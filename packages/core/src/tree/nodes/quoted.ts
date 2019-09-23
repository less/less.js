import Node, { IProps, ILocationInfo } from '../node'
import Value from './value'

type IQuotedOptions = {
  escaped?: boolean
}

type IQuotedNodes = [Value, Node, Value]
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
  nodes: IQuotedNodes

  constructor(props: IProps, options: IQuotedOptions = {}, location?: ILocationInfo) {
    if (options.escaped === undefined) {
      options.escaped = false
    }
    if (Array.isArray(props)) {
      props = { nodes: props }
    }

    super(props, options, location)
    this.allowRoot = options.escaped
  }

  valueOf() {
    return this.nodes[1].toString()
  }
}

Quoted.prototype.type = 'Quoted'
export default Quoted;
