import Node from '../node';
import Element from './element';
import LessError from '../less-error';


// A selector like div .foo@{blah} +/* */ p
//   
//  e.g.
//     elements = ['div',' ','.foo',new Variable('@blah'),'+','p']
//     text = 'div.foo[bar] +/* */ p'
//  
class Selector extends Node {
    getElements(els) {
        if (!els) {
            return [new Element('', '&', false, this._index, this._fileInfo)];
        }
        if (typeof els === 'string') {
            this.parse.parseNode(
                els, 
                ['selector'],
                this._index, 
                this._fileInfo, 
                function(err, result) {
                    if (err) {
                        throw new LessError({
                            index: err.index,
                            message: err.message
                        }, this.parse.imports, this._fileInfo.filename);
                    }
                    els = result[0].elements;
                });
        }
        return els;
    }

    createEmptySelectors() {
        const el = new Element('', '&', false, this._index, this._fileInfo);
        const sels = [new Selector([el], null, null, this._index, this._fileInfo)];
        sels[0].mediaEmpty = true;
        return sels;
    }

    match(other) {
        const elements = this.elements;
        const len = elements.length;
        let olen;
        let i;

        other = other.mixinElements();
        olen = other.length;
        if (olen === 0 || len < olen) {
            return 0;
        } else {
            for (i = 0; i < olen; i++) {
                if (elements[i].value !== other[i]) {
                    return 0;
                }
            }
        }

        return olen; // return number of matched elements
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

Selector.prototype.type = 'Selector';
export default Selector;
