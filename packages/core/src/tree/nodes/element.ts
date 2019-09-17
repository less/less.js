import Node, { NodeArray } from '../node'
import Paren from './block'
import Combinator from './combinator'

class Element extends Node {
  children: {
    combinator: NodeArray
    /** 
     * The simple selector e.g. [sel='val']
     * @todo - we need a way to store the above selector as normalized
     */
    value: NodeArray
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
