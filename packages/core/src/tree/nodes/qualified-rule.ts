import Node, { IObjectProps, INodeOptions, ILocationInfo, IChildren } from '../node'
import Rules from './rules'
import List from './list'

export type IQualifiedRuleProps = {
  selectors: Node[]
  rules: Rules,
  condition?: Node
}
/**
 * A Qualified Rule is a rules preceded by selectors.
 * In Less, it may also have a condition node.
 */
class QualifiedRule extends Node {
  rules: Node[]
  selectors: Node[]
  condition: Node[]

  constructor(props: IQualifiedRuleProps, options: INodeOptions, location: ILocationInfo) {
    const { selectors, rules, condition } = props
    const newProps: IObjectProps = {
      rules: [rules]
    }
    if (selectors.length !== 1) {
      newProps.selectors = [new List(selectors)]
    }
    if (condition) {
      newProps.condition = [condition]
    }
    super(newProps, options, location)
  }
}

QualifiedRule.prototype.type = 'QualifiedRule'
export default QualifiedRule
