import Node, { IProps, ILocationInfo, INodeOptions } from '../node'
import WS from './ws'
import Generic from './generic'

/**
 * A combinator may include comments and/or variant whitespace preceding a selector.
 * We normalize this in the combinator instance property for equality / indexing
 */
class Combinator extends Node {
  combinator: string = ''
  constructor(props: IProps, location: ILocationInfo, options: INodeOptions) {
    super(props, location, options)
    this.value.forEach(node => {
      if (node instanceof WS && this.combinator === '') {
        this.combinator = ' '
      }
      if (node instanceof Generic) {
        this.combinator = node.text
      }
    })
  }
}

Combinator.prototype.type = 'Combinator'
export default Combinator
