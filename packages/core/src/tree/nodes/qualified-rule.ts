import Node, { INodeOptions, ILocationInfo, IProps } from '../node'
import Rules from './rules'
import List from './list'
import Selector from './selector'
import { mergeList } from '../util'

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
    const newProps: IProps = {
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

  eval(context) {
     /**
     * Selector eval is not like other evals that flatten arrays into the container array
     * Instead, we use the mergeList utility
     */
    const selectorList = this.children.selectors[0].clone()
    const selectors = selectorList.nodes
    const createdSelectors: Selector[] = []

    if (selectors && selectors.length > 0) {
      selectors.forEach((sel: Selector) => {
        sel.eval(context)
        const elements = sel.nodes
        const selectorList: Element[][] = mergeList(elements)
        selectorList.forEach(elementList => {
          const newSelector = sel.clone()
          newSelector.nodes = elementList
          createdSelectors.push(newSelector)
        })
      })
      this.children.selectors[0].nodes = createdSelectors
    }

    let selCnt: number
    let selector: Node
    let i: number
    let hasVariable: boolean
    let hasOnePassingSelector: boolean = false;

    if (this.children.selectors && (selCnt = this.children.selectors.length)) {
      selectors = new Array(selCnt)
      defaultFunc.error({
        type: 'Syntax',
        message: 'it is currently only allowed in parametric mixin guards,'
      })

      for (i = 0; i < selCnt; i++) {
        selector = this.selectors[i].eval(context)
        for (var j = 0; j < selector.elements.length; j++) {
            if (selector.elements[j].isVariable) {
                hasVariable = true
                break;
            }
        }
        selectors[i] = selector;
        if (selector.evaldCondition) {
            hasOnePassingSelector = true;
        }
      }

      if (hasVariable) {
          const toParseSelectors = new Array(selCnt);
          for (i = 0; i < selCnt; i++) {
              selector = selectors[i];
              toParseSelectors[i] = selector.toCSS(context);
          }
      }

      defaultFunc.reset()
    } else {
        hasOnePassingSelector = true
    }
    // if (!hasOnePassingSelector) {
    //   rules.length = 0;
    // }
  }
}

QualifiedRule.prototype.type = 'QualifiedRule'
export default QualifiedRule
