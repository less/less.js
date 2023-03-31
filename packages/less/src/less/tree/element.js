import Node from './node.js';
import Paren from './paren.js';
import Combinator from './combinator.js';

const Element = function(combinator, value, isVariable, index, currentFileInfo, visibilityInfo) {
    this.combinator = combinator instanceof Combinator ?
        combinator : new Combinator(combinator);

    if (typeof value === 'string') {
        this.value = value.trim();
    } else if (value) {
        this.value = value;
    } else {
        this.value = '';
    }
    this.isVariable = isVariable;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.copyVisibilityInfo(visibilityInfo);
    this.setParent(this.combinator, this);
}

Element.prototype = Object.assign(new Node(), {
    type: 'Element',

    accept(visitor) {
        const value = this.value;
        this.combinator = visitor.visit(this.combinator);
        if (typeof value === 'object') {
            this.value = visitor.visit(value);
        }
    },

    eval(context) {
        return new Element(this.combinator,
            this.value.eval ? this.value.eval(context) : this.value,
            this.isVariable,
            this.getIndex(),
            this.fileInfo(), this.visibilityInfo());
    },

    clone() {
        return new Element(this.combinator,
            this.value,
            this.isVariable,
            this.getIndex(),
            this.fileInfo(), this.visibilityInfo());
    },

    genCSS(context, output) {
        output.add(this.toCSS(context), this.fileInfo(), this.getIndex());
    },

    toCSS(context) {
        context = context || {};
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
});

export default Element;
