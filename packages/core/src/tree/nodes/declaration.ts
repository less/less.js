import {
  Node,
  IProps,
  ILocationInfo,
  ImportantNode,
  Value
} from '.'

import { EvalContext } from '../contexts'

/**
 * Will merge props using space or comma separators
 */
export enum MergeType {
  SPACED,
  COMMA
}

export type IDeclarationOptions = {
  isVariable?: boolean
  mergeType?: MergeType
}

export class Declaration extends Node implements ImportantNode {
  value: string
  name: Node[]
  /** Declaration's value */
  nodes: Node[]
  important: Node[]

  options: IDeclarationOptions

  constructor(props: IProps, options: IDeclarationOptions, location: ILocationInfo) {
    const { important } = props
    if (!important) {
      props.important = []
    }
    super(props, options, location)
  }

  toString() {
    return this.pre + this.value + ':' + this.nodes.join('') + this.important.join('') + this.post
  }

  eval(context: EvalContext) {
    if (!this.evaluated) {
      const evalFunc = (node: Node) => node.eval(context)
      context.importantScope.push({})
      this.processNodeArray(this.name, evalFunc)
      this.value = this.name.join('')
      this.processNodeArray(this.nodes, evalFunc)
      this.processNodeArray(this.important, evalFunc)

      this.evaluated = true

      let important = this.important[0]
      const importantResult = context.importantScope.pop()
      if (!important && importantResult.important) {
        this.important = [new Value(importantResult.important)]
      }
    }

    return this
  }

  makeImportant() {
    this.important = [new Value('!important')]
    return this
  }
}

Declaration.prototype.type = 'Declaration'
