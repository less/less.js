import Node, { ISimpleProps, ILocationInfo, INodeOptions } from './node'

export interface IChildren {
  [key: string]: Node[]
}
export type IProps = ISimpleProps & IChildren

/**
 * These nodes have 2 traits: 
 *   1. They can have children
 *   2. They can accept visitors and any accepted visitors visit their children
 */
export class NestedNode extends Node {
  children: IChildren

  constructor({ value, text, ...children }: IProps, location: ILocationInfo, options: INodeOptions) {
    super({value, text}, location, options)
    this.children = children || {}
    this.setParent()
  }

  setParent() {
    const entries = Object.entries(this.children)
    entries.forEach(entry => {
      const nodes = entry[1]
      if (nodes) {
        nodes.forEach(node => {
          node.parent = this
        })
      }
    })
  }

  /** Generalized visitor accept method */
  accept(visitor) {
    const children = Object.entries(this.children)
    children.forEach(entry => {
      const nodes = entry[1]
      if (nodes) {
        this.children[entry[0]] = visitor.visit(nodes)
      }
    })
  }

  clone(): this {
    const newNode = super.clone()
    const childrenKeys = Object.keys(this.children)
    childrenKeys.forEach(key => {
      const nodes = this.children[key]
      if (nodes) {
        const newCollection: Node[] = []
        nodes.forEach(node => {
          newCollection.push(node.clone())
        })
        newNode.children[key] = newCollection
      }
    })

    return newNode
  }
}
