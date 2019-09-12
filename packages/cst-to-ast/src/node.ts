import { CstNodeLocation } from 'chevrotain'

export interface IChildren {
  [key: string]: Node[]
}
export type IProps = {
  /** Primitive value */
  value?: (string | number) | (string | number)[]
  text?: string
} & IChildren

export interface INodeOptions {
  [key: string]: boolean
}

export interface ILocationInfo extends CstNodeLocation {

}

export abstract class Node {
  /**
   * This is the normalized primitive value,
   * used for lookups, operations, and comparisons
   * 
   * e.g. Color may be
   *   { value: [255, 255, 255, 1], text: '#FFFFFF' } or
   *   { value: [255, 255, 255, 1], text: 'white' }
   */
  value: (string | number) | (string | number)[]

  /** Used if string does not equal normalized primitive */
  text: string
  options: INodeOptions
  children: IChildren

  /**
   * This will be the start values from the first token and the end
   * values from the last token, as well as file info
   */
  location: ILocationInfo

  parent: Node
  visibilityBlocks: number
  
  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent
  // renamed from nodeVisible
  isVisible: boolean

  isRoot: boolean
  root: Node
  type: string

  constructor(props: IProps, location: ILocationInfo, options: INodeOptions = {}) {
    const { value, text, ...children } = props
    this.value = value
    this.text = text
    this.children = children || {}
    this.location = location
    this.options = options

    this.isRoot = false
    this.visibilityBlocks = 0
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

  valueOf() {
    return this.value
  }

  /** Must be implemented by node */
  toString() {
    return this.text || this.value
  }

  clone(): Node {
    const Clazz = Object.getPrototypeOf(this)
    const newNode = new Clazz({
      value: Array.isArray(this.value) ? [...this.value] : this.value,
      text: this.text
    }, {...this.location}, {...this.options})
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

    /** Copy basic node props */
    newNode.parent = this.parent
    newNode.visibilityBlocks = this.visibilityBlocks
    newNode.isVisible = this.isVisible
    newNode.isRoot = this.isRoot
    newNode.root = this.root
    newNode.type = this.type

    return newNode
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

  eval() { return this.clone() }

  // Returns true if this node represents root of ast imported by reference
  // blocksVisibility() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     return this.visibilityBlocks !== 0;
  // }

  // addVisibilityBlock() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     this.visibilityBlocks = this.visibilityBlocks + 1;
  // }

  // removeVisibilityBlock() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     this.visibilityBlocks = this.visibilityBlocks - 1;
  // }

  // Turns on node visibility - if called node will be shown in output regardless
  // of whether it comes from import by reference or not
  // ensureVisibility() {
  //     this.nodeVisible = true;
  // }

  // Turns off node visibility - if called node will NOT be shown in output regardless
  // of whether it comes from import by reference or not
  // ensureInvisibility() {
  //     this.nodeVisible = false;
  // }

  // return values:
  // isVisible() {
  //     return this.nodeVisible;
  // }

  // visibilityInfo() {
  //     return {
  //         visibilityBlocks: this.visibilityBlocks,
  //         nodeVisible: this.nodeVisible
  //     };
  // }

  copyVisibilityInfo(info: {isVisible: boolean; visibilityBlocks: number }) {
    if (!info) {
      return
    }
    this.visibilityBlocks = info.visibilityBlocks
    this.isVisible = info.isVisible
  }
}

export default Node
