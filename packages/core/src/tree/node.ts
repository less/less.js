import { CstNodeLocation } from 'chevrotain'
import { RewriteUrlMode } from '../constants'
import { IOptions } from '../options'
import { EvalContext } from '../contexts'

/**
 * Extends a regular array with two convenience methods
 */
export class NodeArray<T = Node> extends Array<T> {
  /**
   * Modify the Node array in place
   * 
   * @param processFunc e.g. (node: Node) => node.eval(context)
   */
  _processValues(processFunc: Function): this {
    let thisLength = this.length
    for (let i = 0; i < thisLength; i++) {
      const item = this[i]
      const node = processFunc(item)
      if (Array.isArray(node)) {
        const nodeLength = node.length
        if (node.length === 0) {
          this.splice(i, 1)
          i--
          continue
        }
        else {
          this.splice(i, 1, ...node)
          thisLength += nodeLength
          i += nodeLength
          continue
        }
      }
      if (node === undefined || node === null || node === false) {
        this.splice(i, 1)
        i--
        continue
      }
      this[i] = node
    }
    return this
  }

  eval(context: EvalContext) {
    this._processValues((node: Node) => node.eval(context))
    return this
  }

  toString() {
    return this.join('')
  }
}

export type ISimpleProps = {
  /** Primitive value */
  value?: Node | Node[]
  primitive?: number | boolean | number[]
  text?: string
}

export interface IChildrenProps {
  [key: string]: Node[] | NodeArray
}

export interface IChildren {
  [key: string]: NodeArray
}

export type IProps = ISimpleProps & IChildrenProps
export interface ILocationInfo extends CstNodeLocation {}
/**
 * In practice, this will probably be inherited through the prototype chain
 * during creation.
 * 
 * So the "own properties" should be CstNodeLocation info, but should do an
 * Object.create() from the location info of the stylesheet root location info
 */
export interface IFileInfo {
  filename: string
  currentDirectory: string
  entryPath: string
}

export type IRootOptions = {
  /** Passed in for every file root node */
  fileInfo?: IFileInfo
  /** Only one node, the root node, should pass this in */
  options?: IOptions
}

export type INodeOptions = IRootOptions & {
  [key: string]: boolean | number
}

export abstract class Node {
  /**
   * This is the normalized primitive value,
   * used for lookups, operations, and comparisons
   * 
   * e.g. Color may be
   *   { value: [255, 255, 255, 1], text: '#FFFFFF' } or
   *   { value: [255, 255, 255, 1], text: 'white' }
   * 
   * In short, the value should never contain Nodes because it is not visited
   */
  value: NodeArray
  children: IChildren
  childKeys: string[]

  /** Used if string does not equal normalized primitive */
  primitive: number | boolean | number[]
  text: string

  options: INodeOptions
  evalOptions: IOptions
  fileInfo: IFileInfo

  /**
   * This will be the start values from the first token and the end
   * values from the last token, as well as file info
   */
  location: ILocationInfo

  parent: Node
  root: Node
  fileRoot: Node

  visibilityBlocks: number
  
  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent
  // renamed from nodeVisible
  isVisible: boolean

  type: string
  evaluated: boolean

  constructor(props: IProps, location: ILocationInfo, opts: INodeOptions = {}) {
    const { primitive, value, text, ...children } = props
    this.value = this.normalizeValues(value)
    this.children = this.normalizeChildren(children)
  
    if (this.value.length > 0) {
      children.value = this.value
    }
    
    this.childKeys = Object.keys(children)
    this.setParent()
  
    this.primitive = primitive
    this.text = text
    this.location = location
  
    const { fileInfo, options, ...rest } = opts
    this.options = rest
    if (options) {
      this.root = this
      this.evalOptions = options
    }
    if (fileInfo) {
      this.fileRoot = this
      this.fileInfo = fileInfo
    }

    this.evaluated = false
    this.visibilityBlocks = 0
  }

  protected setParent() {
    this.childKeys.forEach(key => {
      const nodes = this.children[key]
      nodes.forEach(node => {
        node.parent = this
        if (!node.fileRoot) {
          node.fileRoot = this.fileRoot
        }
        if (!node.root) {
          node.root = this.root
        }
      })
    })
  }

  protected normalizeValues(values: Node | Node[]): NodeArray {
    let returnValue: NodeArray
    if (!Array.isArray(values)) {
      if (values === undefined) {
        return new NodeArray()
      }
      returnValue = new NodeArray(values)
    } else {
      returnValue = new NodeArray(...values)
    }
    return returnValue
  }

  /**
   * Convert children arrays to NodeArrays
   */
  protected normalizeChildren(children: IChildrenProps) {
    Object.entries(children).forEach(entry => {
      const nodes = entry[1]
      if (nodes) {
        if (!(nodes instanceof NodeArray)) {
          children[entry[0]] = new NodeArray(...nodes)
        }
      }
    })
    return <IChildren>children
  }

  accept(visitor) {
    this.processChildren(this, (node: Node) => visitor.visit(node))
  }

  valueOf() {
    if (this.primitive !== undefined) {
      return this.primitive
    }
    if (this.text !== undefined) {
      return this.text
    }
    return this.value.toString()
  }

  toString() {
    if (this.text !== undefined) {
      return this.text
    }
    if (this.primitive !== undefined) {
      return this.primitive.toString()
    }
    return this.value.toString()
  }

  /**
   * Derived nodes can pass in context to eval and clone at the same time
   */
  clone(context?: EvalContext): any {
    const Clazz = Object.getPrototypeOf(this)
    const newNode = new Clazz({
      value: [...this.value],
      primitive: this.primitive,
      text: this.text
    /** For now, there's no reason to mutate this.location, so its reference is just copied */
    }, this.location, {...this.options})

    newNode.childKeys = [...this.childKeys]
    this.processChildren(newNode, (node: Node) => node.clone(context))
    if (context) {
      newNode.evaluated = true
    } else {
      newNode.evaluated = this.evaluated
    }
    /** Copy basic node props */
    newNode.parent = this.parent
    newNode.root = this.root
    newNode.fileRoot = this.fileRoot
    newNode.fileInfo = this.fileInfo
    newNode.evalOptions = this.evalOptions
    newNode.visibilityBlocks = this.visibilityBlocks
    newNode.isVisible = this.isVisible
    newNode.type = this.type

    return newNode
  }

  private processChildren(node: Node, processFunc: Function) {
    this.childKeys.forEach(key => {
      let nodes = this.children[key]
      if (nodes) {
        if (node !== this) {
          nodes = new NodeArray(...nodes)
        }
        node.children[key] = nodes._processValues(processFunc)
      }
    })
  }
  /**
   * By default, nodes will just evaluate nested values
   * However, some nodes after evaluating will of course override
   * this to produce different node types or primitive values
   */
  eval(context?: EvalContext): any {
    if (!this.evaluated) {
      this.processChildren(this, (node: Node) => node.eval(context))
    }
    this.evaluated = true
    return this
  }

  /** Output is a kind of string builder? */
  genCSS(output: any, context?: EvalContext) {
    output.add(this.toString())
  }

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
