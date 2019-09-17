import Node, { ISimpleProps, ILocationInfo, NodeArray } from '../node'
import { EvalContext } from '../../contexts'

type IDeclarationProps = ISimpleProps & {
  name: NodeArray,
  value: NodeArray,
  important: NodeArray
}

/**
 * Will merge props using space or comma separators
 */
export enum MergeType {
  SPACED,
  COMMA
}

type IDeclarationOptions = {
  isVariable?: boolean
  mergeType?: MergeType
}

class Declaration extends Node {
  constructor(props: IDeclarationProps, location: ILocationInfo, options: IDeclarationOptions) {
    super(props, location, options)
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