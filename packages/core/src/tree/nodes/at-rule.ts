import Node, { IBaseProps, IObjectProps, ILocationInfo, INodeOptions } from '../node'
import Rules from './rules'

/**
 * @todo - an atrule should not have rules, it should have an optional rules,
 *  so that it doesn't have to repeat methods like find() and variable()
 */
type IAtRuleProps = {
  name: string
  /** Prelude (everything after name and before ; or {) */
  prelude: Node
  /** Optional set of rules */
  rules?: Rules
} & IBaseProps

class AtRule extends Node {
  name: string
  rules: Node[]
  prelude: Node[]

  constructor(props: IAtRuleProps, options: INodeOptions, location: ILocationInfo) {
    const { name, prelude, rules, pre, post } = props
    const newProps = <IObjectProps>{ pre, post }
    newProps.prelude = [prelude]

    if (rules) {
      newProps.rules = [rules]
    }
    
    /** Wrap at rule body in an empty rules for proper scoping and collapsing */
    super(newProps, options, location)
    this.name = name
    this.allowRoot = true
  }

  toString() {
    let text = this.pre + this.name + this.prelude.join('')
    if (this.rules) {
      text += this.rules.join('')
    }
    text += this.post
    return text
  }

  isCharset() {
    return '@charset' === this.name
  }

  eval(context) {
    let mediaPathBackup
    let mediaBlocksBackup

    /** @todo - What is mediaPath and mediaBlocks? */
    // media stored inside other atrule should not bubble over it
    // backpup media bubbling information
    mediaPathBackup = context.mediaPath
    mediaBlocksBackup = context.mediaBlocks
    // deleted media bubbling information
    context.mediaPath = []
    context.mediaBlocks = []

    super.eval(context)

    // restore media bubbling information
    context.mediaPath = mediaPathBackup
    context.mediaBlocks = mediaBlocksBackup

    return this
  }
}

AtRule.prototype.type = 'AtRule';
export default AtRule;
