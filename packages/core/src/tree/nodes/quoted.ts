import Node, { IProps, ILocationInfo } from '../node'
import Variable from './variable-ref'
import Property from './property-ref'
import { primitiveCompare } from '../util'

type IQuotedOptions = {
  escaped?: boolean
}

/**
 * There's nothing special about a quoted node, other than
 * the first and last member will contain quote marks
 *   e.g. new Quoted([new Value('"'), new Value('foo'), new Value('"')])
 * 
 * It's not a single value because
 *   1) it may contain interpolated vars
 *   2) we can do normalized equality checks with the "inner" nodes
 */
class Quoted extends Node {
  constructor(props: IProps, options: IQuotedOptions = {}, location?: ILocationInfo) {
    if (options.escaped === undefined) {
      options.escaped = false
    }
    super(props, options, location)
    this.allowRoot = options.escaped
  }

  valueOf() {
    return this.nodes.slice(1, -1).join('')
  }
}

Quoted.prototype.type = 'Quoted';
export default Quoted;
