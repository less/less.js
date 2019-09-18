import Node, { IProps, INodeOptions, ILocationInfo } from '../node'
import Value from './value'
import Paren from './block'

type IElementProps = [string, string] | IProps
/**
 * An element's values list will be exactly two Values,
 * so that they can have normalized values for indexing / lookups
 */
class Element extends Node {
  children: {
    values: [Value, Value]
  }

  constructor(props: IElementProps, options?: INodeOptions, location?: ILocationInfo) {
    let valueNodes: Node[]
    if (props[0].constructor === String) {
      valueNodes = [new Value(<string>props[0]), new Value(<string>props[1])]
    } else {
      valueNodes = <Node[]>(props.values || props)
    }
    super(valueNodes, options, location)
  }

  /** Indexable value */
  valueOf() {
    let combinator = (this.values[0].value || '').toString()
    let simpleSelector = (this.values[1].value || '').toString()
    return combinator + simpleSelector
  }

  toString() {
    return this.values[0].text + this.values[1].text
  }

  toCSS(context = {}) {
    let value = this.value;
    const firstSelector = context.firstSelector;
    if (value instanceof Paren) {
      // selector in parens should not be affected by outer selector
      // flags (breaks only interpolated selectors - see #1973)
      context.firstSelector = true;
    }
    value = value.toCSS ? value.toCSS(context) : value;
    context.firstSelector = firstSelector;
    if (value === '' && this.combinator.value.charAt(0) === '&') {
        return '';
    } else {
        return this.combinator.toCSS(context) + value;
    }
  }
}

Element.prototype.type = 'Element';
export default Element;
