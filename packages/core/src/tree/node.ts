import { CstNodeLocation } from 'chevrotain'
import { RewriteUrlMode } from '../constants'
import { IOptions } from '../options'
import { EvalContext } from '../contexts'


/** @todo type context */
type valueItem = Node | ((string | number | boolean) & {
  eval(context: EvalContext): Node
})

type simpleValue = string | number | boolean | Node

export type ISimpleProps = {
  /** Primitive value */
  value?: simpleValue | simpleValue[]
  text?: string
}

export interface IChildren {
  [key: string]: valueItem[]
}
export type IProps = ISimpleProps & IChildren

export type IRootOptions = {
  isFileRoot?: boolean
  /** Only one node, the root node, should pass this in */
  options?: IOptions
}

export type INodeOptions = IRootOptions & {
  [key: string]: boolean
}

/**
 * In practice, this will probably be inherited through the prototype chain
 * during creation.
 * 
 * So the "own properties" should be CstNodeLocation info, but should do an
 * Object.create() from the location info of the stylesheet root location info
 */
export interface ILocationInfo extends CstNodeLocation {
  /** @todo - this should be on this.root */
  filename: string
  /**
   * @todo - why is this copied here?
   * Should we just copy options into the AST?
   */
  rewriteUrls: RewriteUrlMode  // context.rewriteUrls
  rootpath: string  // context.rootpath
  currentDirectory: string
  entryPath: string
  rootFilename: string
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
  value: valueItem[]
  children: IChildren
  childKeys: string[]

  /** Used if string does not equal normalized primitive */
  text: string
  options: INodeOptions

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
  evaluated: boolean

  constructor(props: IProps, location: ILocationInfo, opts: INodeOptions = {}) {
    const { text, value, ...children } = props
    this.value = this.normalizeValues(value)

    if (this.value.length > 0) {
      children.value = this.value
    }
    this.children = children
    this.childKeys = Object.keys(children)
    this.setParent()
  
    this.text = text
    this.location = location
  
    const { isFileRoot, options, ...rest } = opts
    this.options = rest

    this.evaluated = false
    this.isRoot = false
    this.visibilityBlocks = 0
  }

  protected setParent() {
    this.childKeys.forEach(key => {
      const nodes = this.children[key]
      nodes.forEach(node => {
        if (node instanceof Node) {
          node.parent = this
        }
      })
    })
  }

  protected primitive(value: any): valueItem {
    return Object.assign(value, {
      eval(context?: EvalContext) {
        return value.valueOf()
      }
    })
  }

  protected normalizeValues(values: simpleValue | simpleValue[]) {
    if (!Array.isArray(values)) {
      if (values === undefined) {
        return []
      }
      values = [values]
    }
    values.forEach((value, i) => {
      if (!(value instanceof Node)) {
        values[i] = this.primitive(value)
      }
    })
    return <valueItem[]>values
  }

  accept(visitor) {
    this.processChildren(this, (node: Node) => visitor.visit(node))
  }

  toString() {
    return this.text || this.value.join('')
  }

  /**
   * Derived nodes can pass in context to eval and clone at the same time
   */
  clone(context?: EvalContext): any {
    const Clazz = Object.getPrototypeOf(this)
    const newNode = new Clazz({
      value: [...this.value],
      text: this.text
    /** For now, there's no reason to mutate this.location, so its reference is just copied */
    }, this.location, {...this.options})

    this.processChildren(newNode, (node: Node) => node.clone(context), context)
    if (context) {
      newNode.evaluated = true
    } else {
      newNode.evaluated = this.evaluated
    }
    /** Copy basic node props */
    newNode.parent = this.parent
    newNode.visibilityBlocks = this.visibilityBlocks
    newNode.isVisible = this.isVisible
    newNode.isRoot = this.isRoot
    newNode.root = this.root
    newNode.type = this.type

    return newNode
  }

  private processChildren(node: Node, processFunc: Function, context?: EvalContext) {
    this.childKeys.forEach(key => {
      const nodes = this.children[key]
      if (nodes) {
        let newCollection: valueItem[] = []
        nodes.forEach(node => {
          let returnNode = node
          if (node instanceof Node) {
            returnNode = processFunc(node)
            if (Array.isArray(returnNode)) {
              newCollection = newCollection.concat(returnNode)
            }
            if (returnNode === undefined || returnNode === null || returnNode === false) {
              return
            }
          }
          newCollection.push(returnNode)
        })
        node.children[key] = newCollection
        if (key === 'value') {
          node.value = newCollection
        }
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
      this.processChildren(this, (node: Node) => node.eval(context), context)
    }
    this.evaluated = true
    return this
  }

  /** Output is a kind of string builder? */
  genCSS(context: EvalContext, output: any) {
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
