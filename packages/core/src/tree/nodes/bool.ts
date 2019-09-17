import Node from '../node'

/**
 * This is a boolean keyword, which can be evaluated as true/false
 */
class Bool extends Node {
  text: string
  primitive: boolean
}

Bool.prototype.type = 'Bool'
export default Bool
