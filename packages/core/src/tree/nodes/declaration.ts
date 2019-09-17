import Node, { NodeArray } from '../node'
import { EvalContext } from '../../contexts'

/**
 * Will merge props using space or comma separators
 */
export enum MergeType {
  SPACED,
  COMMA
}

class Declaration extends Node {
  children: {
    name: NodeArray
    value: NodeArray
    important: NodeArray
  }

  options: {
    isVariable?: boolean
    mergeType?: MergeType
  }


  eval(context: EvalContext) {
    context.importantScope.push({})
    this.value.eval(context)

    let important = this.children.important[0]
    const importantResult = context.importantScope.pop()
    if (!important && importantResult.important) {
      important.text = importantResult.important
    }

    return super.clone(context)
  }

  makeImportant() {
    const decl = this.clone()
    decl.children.important[0].text = '!important'
    return decl
  }
}

Declaration.prototype.type = 'Declaration';
export default Declaration;