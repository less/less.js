import Node, { IProps, ILocationInfo, INodeOptions, IBaseProps, IChildren } from '../node'
import Rules from './rules'

/**
 * @todo - an atrule should not have rules, it should have an optional rules,
 *  so that it doesn't have to repeat methods like find() and variable()
 */
interface IAtRuleProps {
  name: string
  /** Prelude (everything after name and before ; or {) */
  prelude: Node,
  /** Optional set of rules */
  rules: Rules
}

class AtRule extends Node {
  name: string
  rules: Node[]
  children: {
    prelude: Node[]
    rules: Node[]
  }

  constructor(props: IAtRuleProps, options: INodeOptions, location: ILocationInfo) {
    const { name, prelude, rules } = props
    const children: IChildren = {
      prelude: [prelude]
    }
    if (rules) {
      children.rules = [rules]
    }
    /** Wrap at rule body in an empty rules for proper scoping and collapsing */
    super(children, options, location)
    this.name = name
    this.allowRoot = true
  }

  isCharset() {
    return '@charset' === this.name
  }

  eval(context) {
    let mediaPathBackup
    let mediaBlocksBackup
    let prelude = this.nodes
    let rules = this.rules

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
