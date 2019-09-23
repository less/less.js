import { CstNodeLocation } from 'chevrotain'
import { IOptions } from '../options'
import { EvalContext } from './contexts'
import { compare } from './util/compare'
import { Rules, Import, Declaration } from './nodes'

export type SimpleValue = string | number | boolean | number[]

export type IChildren = {
  [key: string]: Node[]
}

export type IBaseProps = {
  /** Each node may have pre or post Nodes for comments or whitespace */
  pre?: Node | string
  post?: Node | string
  /**
   * Primitive or simple representation of value.
   * This is used in valueOf() for math operations,
   * and also in indexing and lookups for some nodes
   */
  value?: SimpleValue
  /**
   * The reason this exists in addition to value is that this is the
   * ACTUAL text representation of value
   *   e.g. 1) a color may have a value of [0, 0, 0, 1], but a text value of 'black'
   *        2) an element's simple selector may have a value of '[foo="bar"]',
   *           but a text value of '[foo=bar]' (for normalization)
   */
  text?: string

  /**
   * Most nodes will have a single sub-node collection under this property
   */
  nodes?: Node[]
}

export type IProps = {
  [P in keyof IBaseProps]: IBaseProps[P]
} & IChildren

/**
 * The result of an eval can be one of these types
 */
export type EvalReturn = Node[] | Node | false

export type ProcessFunction = (node: Node) => EvalReturn

// export type IProps = Node[] | (IChildren & ISimpleProps)
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

export type INodeOptions = {
  [key: string]: boolean | number | string
} & Partial<IFileInfo>

export enum MatchOption {
  /** Return first result */
  FIRST,
  /** Return all matches in the ruleset where the first match is found */
  IN_RULES,
  /** Return all matches found while searching up the tree */
  IN_SCOPE
}

export abstract class Node {

  /**
   * When nodes only have a single list of sub-nodes, they'll use the nodes prop,
   * which reduces boilerplate when used. 
   *
   * This will always be present as an array, even if it is empty
   */
  nodes: Node[]
  pre: Node | string
  post: Node | string

  children: IChildren
  childKeys: string[]

  /** Used if string does not equal normalized primitive */
  value: SimpleValue
  text: string

  options: INodeOptions
  lessOptions: IOptions
  fileInfo: IFileInfo

  allowRoot: boolean

  /**
   * This will be the start values from the first token and the end
   * values from the last token, as well as file info
   */
  location: ILocationInfo

  parent: Node
  root: Rules
  fileRoot: Rules

  visibilityBlocks: number
  evalFirst: boolean
  
  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent
  // renamed from nodeVisible
  isVisible: boolean

  type: string

  /** eval() was called */
  evaluated: boolean

  constructor(props: IProps, options: INodeOptions = {}, location?: ILocationInfo) {
    const { pre, post, value, text, ...children } = props
      /** nodes is always present as an array, even if empty */  
    if (!children.nodes) {
      children.nodes = []
    }
    this.children = children
    this.childKeys = Object.keys(children)
    this.value = value
    this.text = text
    this.pre = pre || ''
    this.post = post || ''
    
    /** Puts each children nodes list at root for convenience */
    this.childKeys.forEach(key => {
      Object.defineProperty(this, key, {
        get() {
          return this.children[key]
        },
        set(newValue: Node[]) {
          this.children[key] = newValue
        },
        enumerable: false,
        configurable: false
      })
    })
    
    this.setParent()
    this.location = location
  
    if (options.isRoot && this instanceof Rules) {
      this.root = this
    }
    if (options.filename && this instanceof Rules) {
      this.fileRoot = this
      this.fileInfo = <IFileInfo>options
    } else {
      this.options = options
    }

    this.evaluated = false
    this.visibilityBlocks = 0

    /**
     * No node should be adding properties to this.children after the constructor
     */
    Object.seal(this.children)
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

  accept(visitor) {
    this.processChildren(this, (node: Node) => visitor.visit(node))
  }

  valueOf() {
    if (this.value !== undefined) {
      return this.value
    }
    if (this.text !== undefined) {
      return this.text
    }
    return this.nodes.map(node => node.valueOf()).join('')
  }

  toString() {
    let text: string
    if (this.text !== undefined) {
      text = this.text
    } else if (this.value !== undefined) {
      text = this.value.toString()
    } else {
      text = this.nodes.join('')
    }
    return this.pre + text + this.post
  }

  /** Nodes may have individual compare strategies */
  compare(node: Node) {
    return compare(this, node)
  }

  /**
   * Attach properties from inherited node.
   * This is used when cloning, but also when
   * doing any kind of node replacement (during eval).
   */
  inherit(inheritFrom: Node): this {
    this.pre = inheritFrom.pre
    this.post = inheritFrom.post
    this.location = inheritFrom.location
    this.parent = inheritFrom.parent
    this.root = inheritFrom.root
    this.fileRoot = inheritFrom.fileRoot
    this.fileInfo = inheritFrom.fileInfo
    this.visibilityBlocks = inheritFrom.visibilityBlocks
    this.isVisible = inheritFrom.isVisible
    return this
  }

  /**
   * Derived nodes can pass in context to eval and clone at the same time.
   * 
   * Typically a clone of the entire tree happens at the beginning of the eval cycle,
   * but it is sometimes re-used by sub-nodes during eval.
   * 
   * @param shallow - doesn't deeply clone nodes (retains references)
   */
  clone(shallow: boolean = false): this {
    const Clazz = Object.getPrototypeOf(this)
    const newNode = new Clazz({
      pre: this.pre,
      post: this.post,
      value: this.value,
      text: this.text,
      ...this.children
    /** For now, there's no reason to mutate this.location, so its reference is just copied */
    }, {...this.options}, this.location)
    
    /**
     * First copy over Node-specific props
     * 
     * @todo - @addtest - make sure methods are not copied
     */
    for (let prop in this) {
      if (this.hasOwnProperty(prop)) {
        newNode[prop] = this[prop]
      }
    }

    newNode.childKeys = [...this.childKeys]

    /** Copy over props defined in this file */
    newNode.inherit(this)

    /**
     * We update the root reference but not fileRoot.
     * (fileRoot is the original tree)
     */
    if (this instanceof Rules && this === this.root) {
      newNode.root = newNode
    }

    if (!shallow) {
      /**
       * Perform a deep clone
       * This will overwrite the parent / root props of children nodes.
       */
      this.processChildren(newNode, (node: Node) => node.clone(true))
    }
  
    if (context) {
      newNode.evaluated = true
    } else {
      newNode.evaluated = this.evaluated
    }

    return newNode
  }

  protected getFileInfo(): IFileInfo {
    return this.fileRoot.fileInfo
  }

  /**
   * Convenience method if location isn't copied to new nodes
   * for any reason (such as a custom function)
   */
  protected getLocation(): ILocationInfo {
    let node: Node = this
    while (node) {
      if (node.location) {
        return node.location
      }
      node = node.parent
    }
  }

  find(matchFunction: Function, option: MatchOption = MatchOption.FIRST): Node | Node[] {
    let node: Node = this
    const matches: Node[] = []
    const crawlRules = (rulesNode: Rules) => {
      const nodes = rulesNode.nodes
      const nodeLength = this.nodes.length

      for (let i = nodeLength; i > 0; i--) {
        const node = nodes[i - 1]
        const match = matchFunction(node)
        if (match) {
          matches.push(match)
          if (option === MatchOption.FIRST) {
            break
          }
        }
        if (node instanceof Import) {
          const content = node.content[0]
          if (content instanceof Rules) {
            crawlRules(content)
          }
        }
      }
    }
    while (node) {
      if (node instanceof Rules) {
        crawlRules(node)
        if (matches.length && option !== MatchOption.IN_SCOPE) {
          if (MatchOption.FIRST) {
            return matches[0]
          }
          return matches
        }
      }

      node = this.parent
    }

    return matches.length ? matches : undefined
  }

  /** Moved from Rules property() method */
  findProperty(name: string): Declaration[] {
    return <Declaration[]>this.find((node: Node) => (
      node instanceof Declaration &&
      !node.options.isVariable &&
      node.value === name
    ), MatchOption.IN_RULES)
  }

  /** Moved from Rules variable() method */
  findVariable(name: string): Declaration {
    return <Declaration>this.find((node: Node) => (
      node instanceof Declaration &&
      node.options.isVariable &&
      node.value === name
    ), MatchOption.FIRST)
  }

  /**
   * This is an in-place mutation of a node array
   * 
   * Unresolved Q: would a new array be more performant than array mutation?
   * The reason we do this is because the array may not mutate at all depending
   * on the result of processing
   * 
   * This also allows `this.value` to retain a pointer to `this.children.value`
   */
  protected processNodeArray(nodeArray: Node[], processFunc: ProcessFunction) {
    let thisLength = nodeArray.length
    for (let i = 0; i < thisLength; i++) {
      const item = nodeArray[i]
      const returnValue = processFunc(item)
      if (Array.isArray(returnValue)) {
        const nodeLength = returnValue.length
        if (returnValue.length === 0) {
          nodeArray.splice(i, 1)
          i--
          continue
        }
        else {
          nodeArray.splice(i, 1, ...returnValue)
          thisLength += nodeLength
          i += nodeLength
          continue
        }
      }
      if (returnValue === undefined || returnValue === null || returnValue === false) {
        nodeArray.splice(i, 1)
        i--
        continue
      }
      nodeArray[i] = returnValue
    }
    return nodeArray
  }

  protected processChildren(node: Node, processFunc: ProcessFunction) {
    this.childKeys.forEach(key => {
      let nodes = this.children[key]
      if (nodes) {
        if (node !== this) {
          /** This is during cloning */
          nodes = [...nodes]
          node.children[key] = this.processNodeArray(nodes, processFunc)
          nodes.forEach((n: Node) => {
            n.parent = node
            n.root = node.root
          })
        } else {
          this.processNodeArray(nodes, processFunc)
        }
      }
    })
  }

  private inheritChild(node: Node) {
    node.parent = this
    node.root = this.root
    node.fileRoot = this.fileRoot
  }

  appendNode(nodes: Node[], insertedNode: Node) {
    this.inheritChild(insertedNode)
    nodes.push(insertedNode)
  }

  prependNode(nodes: Node[], insertedNode: Node) {
    this.inheritChild(insertedNode)
    nodes.unshift(insertedNode)
  }

  /**
   * By default, nodes will just evaluate nested values
   * However, some nodes after evaluating will of course override
   * this to produce different node types or primitive values
   */
  eval(context?: EvalContext): EvalReturn {
    /** All nodes that override eval() should (usually) exit if they're evaluated */
    if (!this.evaluated) {
      this.processChildren(this, (node: Node) => node.eval(context))
    }
    this.evaluated = true
    return this
  }

  error(context: EvalContext, message: string) {
    if (context) {
      context.error({ message }, this.fileRoot)
      return this
    }
    throw new Error(message)
  }

  warn(context: EvalContext, message: string) {
    if (context) {
      context.warning({ message }, this.fileRoot)
    }
    return this
  }

  /**
   * Output is a kind of string builder?
   * @todo - All genCSS and toCSS will get moved out of the AST and
   *         into visitor processing.
  */
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

