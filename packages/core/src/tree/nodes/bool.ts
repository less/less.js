import { Node } from '.'

/**
 * This is a boolean keyword, which can be evaluated as true/false
 */
export class Bool extends Node {
  text: string
  value: boolean
}

Bool.prototype.type = 'Bool'
