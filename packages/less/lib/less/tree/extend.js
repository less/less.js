// @ts-check
/** @import { EvalContext, TreeVisitor, FileInfo, VisibilityInfo } from './node.js' */
import Node from './node.js';
import Selector from './selector.js';

class Extend extends Node {
    get type() { return 'Extend'; }

    /**
     * @param {Selector} selector
     * @param {string} option
     * @param {number} index
     * @param {FileInfo} currentFileInfo
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(selector, option, index, currentFileInfo, visibilityInfo) {
        super();
        this.selector = selector;
        this.option = option;
        this.object_id = Extend.next_id++;
        /** @type {number[]} */
        this.parent_ids = [this.object_id];
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.copyVisibilityInfo(visibilityInfo);
        /** @type {boolean} */
        this.allowRoot = true;
        /** @type {boolean} */
        this.allowBefore = false;
        /** @type {boolean} */
        this.allowAfter = false;

        switch (option) {
            case '!all':
            case 'all':
                this.allowBefore = true;
                this.allowAfter = true;
                break;
            default:
                this.allowBefore = false;
                this.allowAfter = false;
                break;
        }
        this.setParent(this.selector, this);
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        this.selector = /** @type {Selector} */ (visitor.visit(this.selector));
    }

    /** @param {EvalContext} context */
    eval(context) {
        return new Extend(/** @type {Selector} */ (this.selector.eval(context)), this.option, this.getIndex(), this.fileInfo(), this.visibilityInfo());
    }

    // remove when Nodes have JSDoc types
    // eslint-disable-next-line no-unused-vars
    /** @param {EvalContext} [context] */
    clone(context) {
        return new Extend(this.selector, this.option, this.getIndex(), this.fileInfo(), this.visibilityInfo());
    }

    // it concatenates (joins) all selectors in selector array
    /** @param {Selector[]} selectors */
    findSelfSelectors(selectors) {
        /** @type {import('./element.js').default[]} */
        let selfElements = [];
        let i, selectorElements;

        for (i = 0; i < selectors.length; i++) {
            selectorElements = selectors[i].elements;
            // duplicate the logic in genCSS function inside the selector node.
            // future TODO - move both logics into the selector joiner visitor
            if (i > 0 && selectorElements.length && selectorElements[0].combinator.value === '') {
                selectorElements[0].combinator.value = ' ';
            }
            selfElements = selfElements.concat(selectors[i].elements);
        }

        /** @type {Selector[]} */
        this.selfSelectors = [new Selector(selfElements)];
        this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo());
    }
}

Extend.next_id = 0;
export default Extend;
