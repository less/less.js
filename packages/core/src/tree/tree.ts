import { IOptions } from '../options'
import { Node } from './node'

interface IRoot {
  options: IOptions
  node: Node
}

class Tree {
  public root: IRoot
  constructor(options: IOptions) {

  }
}