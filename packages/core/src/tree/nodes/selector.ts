import { Node, Element } from '.'

// A selector like div .foo@{blah} +/* */ p
//   
//  e.g.
//     elements = ['div',' ','.foo',new Variable('@blah'),'+','p']
//     text = 'div.foo[bar] +/* */ p'
//
/** 
 * A Selector node is really just an expression wrapper for elements,
 * so that it can hold pre and post nodes for a selector list.
 */
export class Selector extends Node {
  nodes: Element[]
  options: {
    /** @todo ? what is media empty? */
    mediaEmpty: boolean
  }
  getElements(els: Element[]) {
    if (!els) {
      return [new Element(['', '&'], {}, this.location)]
    }
    return els
  }

  createEmptySelectors() {
    const el = new Element(['', '&'], {}, this.location)
    const sels = [new Selector([el], {}, this.location)]
    sels[0].options.mediaEmpty = true
    return sels
  }

  /**
   * @todo - what's the type of 'other'?
   */
  match(other) {
    const elements = this.values
    const len = elements.length
    let olen: number

    other = other.mixinElements()
    olen = other.length
    if (olen === 0 || len < olen) {
      return 0
    } else {
      for (let i = 0; i < olen; i++) {
        if (elements[i].value !== other[i]) {
          return 0
        }
      }
    }

    return olen // return number of matched elements
  }

  mixinElements() {
      if (this.mixinElements_) {
          return this.mixinElements_;
      }

      let elements = this.elements.map( v => v.combinator.value + (v.value.value || v.value)).join('').match(/[,&#\*\.\w-]([\w-]|(\\.))*/g);

      if (elements) {
          if (elements[0] === '&') {
              elements.shift();
          }
      } else {
          elements = [];
      }

      return (this.mixinElements_ = elements);
  }

  isJustParentSelector() {
      return !this.mediaEmpty &&
          this.elements.length === 1 &&
          this.elements[0].value === '&' &&
          (this.elements[0].combinator.value === ' ' || this.elements[0].combinator.value === '');
  }

  eval(context) {
      const evaldCondition = this.condition && this.condition.eval(context);
      let elements = this.elements;
      let extendList = this.extendList;

      elements = elements && elements.map(e => e.eval(context));
      extendList = extendList && extendList.map(extend => extend.eval(context));

      return this.createDerived(elements, extendList, evaldCondition);
  }

  genCSS(context, output) {
      let i;
      let element;
      if ((!context || !context.firstSelector) && this.elements[0].combinator.value === '') {
          output.add(' ', this.fileInfo(), this.getIndex());
      }
      for (i = 0; i < this.elements.length; i++) {
          element = this.elements[i];
          element.genCSS(context, output);
      }
  }

  getIsOutput() {
      return this.evaldCondition;
  }
}

Selector.prototype.type = 'Selector'
