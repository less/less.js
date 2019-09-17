import Node, { IChildrenProps, ILocationInfo } from '../node'

type IBooleanProps = {
  /** How this keyword is represented in text e.g. 'True' */
  text: string
  primitive: boolean
} & IChildrenProps

/**
 * This is a boolean keyword, which can be evaluated as true/false
 */
class Bool extends Node {
  constructor(props: IBooleanProps, location: ILocationInfo) {
    super(props, location)
  }
}
Bool.prototype.type = 'Bool'
export default Bool
