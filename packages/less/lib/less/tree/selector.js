// @ts-check
import Node from './node.js';
import Element from './element.js';
import LessError from '../less-error.js';
import * as utils from '../utils.js';
import Parser from '../parser/parser.js';

/** @import { EvalContext, CSSOutput, FileInfo, VisibilityInfo, TreeVisitor } from './node.js' */

class Selector extends Node {
    get type() { return 'Selector'; }

    /**
     * @param {(Element | Selector)[] | string} [elements]
     * @param {Node[] | null} [extendList]
     * @param {Node | null} [condition]
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(elements, extendList, condition, index, currentFileInfo, visibilityInfo) {
        super();
        /** @type {Node[] | null | undefined} */
        this.extendList = extendList;
        /** @type {Node | null | undefined} */
        this.condition = condition;
        /** @type {boolean | Node} */
        this.evaldCondition = !condition;
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {Element[]} */
        this.elements = this.getElements(elements);
        /** @type {string[] | undefined} */
        this.mixinElements_ = undefined;
        /** @type {boolean | undefined} */
        this.mediaEmpty = undefined;
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.elements, this);
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        if (this.elements) {
            this.elements = /** @type {Element[]} */ (visitor.visitArray(this.elements));
        }
        if (this.extendList) {
            this.extendList = visitor.visitArray(this.extendList);
        }
        if (this.condition) {
            this.condition = visitor.visit(this.condition);
        }
    }

    /**
     * @param {Element[]} elements
     * @param {Node[] | null} [extendList]
     * @param {boolean | Node} [evaldCondition]
     */
    createDerived(elements, extendList, evaldCondition) {
        elements = this.getElements(elements);
        const newSelector = new Selector(elements, extendList || this.extendList,
            null, this.getIndex(), this.fileInfo(), this.visibilityInfo());
        newSelector.evaldCondition = (!utils.isNullOrUndefined(evaldCondition)) ? evaldCondition : this.evaldCondition;
        newSelector.mediaEmpty = this.mediaEmpty;
        return newSelector;
    }

    /**
     * @param {(Element | Selector)[] | string | null | undefined} els
     * @returns {Element[]}
     */
    getElements(els) {
        if (!els) {
            return [new Element('', '&', false, this._index, this._fileInfo)];
        }
        if (typeof els === 'string') {
            const fileInfo = this._fileInfo;
            const parse = this.parse;
            new (/** @type {new (...args: unknown[]) => { parseNode: Function }} */ (/** @type {unknown} */ (Parser)))(parse.context, parse.importManager, fileInfo, this._index).parseNode(
                els,
                ['selector'],
                function(/** @type {{ index: number, message: string } | null} */ err, /** @type {Selector[]} */ result) {
                    if (err) {
                        throw new LessError({
                            index: err.index,
                            message: err.message
                        }, parse.imports, /** @type {string} */ (/** @type {FileInfo} */ (fileInfo).filename));
                    }
                    els = result[0].elements;
                });
        }
        return /** @type {Element[]} */ (els);
    }

    createEmptySelectors() {
        const el = new Element('', '&', false, this._index, this._fileInfo), sels = [new Selector([el], null, null, this._index, this._fileInfo)];
        sels[0].mediaEmpty = true;
        return sels;
    }

    /**
     * @param {Selector} other
     * @returns {number}
     */
    match(other) {
        const elements = this.elements;
        const len = elements.length;
        let olen;
        let i;

        /** @type {string[]} */
        const mixinEls = other.mixinElements();
        olen = mixinEls.length;
        if (olen === 0 || len < olen) {
            return 0;
        } else {
            for (i = 0; i < olen; i++) {
                if (elements[i].value !== mixinEls[i]) {
                    return 0;
                }
            }
        }

        return olen; // return number of matched elements
    }

    /** @returns {string[]} */
    mixinElements() {
        if (this.mixinElements_) {
            return this.mixinElements_;
        }

        /** @type {string[] | null} */
        let elements = this.elements.map( function(v) {
            return /** @type {string} */ (v.combinator.value) + (/** @type {{ value: string }} */ (v.value).value || v.value);
        }).join('').match(/[,&#*.\w-]([\w-]|(\\.))*/g);

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

    /** @param {EvalContext} context */
    eval(context) {
        const evaldCondition = this.condition && this.condition.eval(context);
        let elements = this.elements;
        /** @type {Node[] | null | undefined} */
        let extendList = this.extendList;

        if (elements) {
            const evaldElements = new Array(elements.length);
            for (let i = 0; i < elements.length; i++) {
                evaldElements[i] = elements[i].eval(context);
            }
            elements = evaldElements;
        }
        if (extendList) {
            const evaldExtends = new Array(extendList.length);
            for (let i = 0; i < extendList.length; i++) {
                evaldExtends[i] = extendList[i].eval(context);
            }
            extendList = evaldExtends;
        }

        return this.createDerived(elements, extendList, evaldCondition);
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        let i, element;
        if ((!context || !/** @type {EvalContext & { firstSelector?: boolean }} */ (context).firstSelector) && this.elements[0].combinator.value === '') {
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

export default Selector;
