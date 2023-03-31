import Node from './node.js';
import Selector from './selector.js';

const Extend = function(selector, option, index, currentFileInfo, visibilityInfo) {
    this.selector = selector;
    this.option = option;
    this.object_id = Extend.next_id++;
    this.parent_ids = [this.object_id];
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.copyVisibilityInfo(visibilityInfo);
    this.allowRoot = true;

    switch (option) {
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
};

Extend.prototype = Object.assign(new Node(), {
    type: 'Extend',

    accept(visitor) {
        this.selector = visitor.visit(this.selector);
    },

    eval(context) {
        return new Extend(this.selector.eval(context), this.option, this.getIndex(), this.fileInfo(), this.visibilityInfo());
    },

    clone(context) {
        return new Extend(this.selector, this.option, this.getIndex(), this.fileInfo(), this.visibilityInfo());
    },

    // it concatenates (joins) all selectors in selector array
    findSelfSelectors(selectors) {
        let selfElements = [], i, selectorElements;

        for (i = 0; i < selectors.length; i++) {
            selectorElements = selectors[i].elements;
            // duplicate the logic in genCSS function inside the selector node.
            // future TODO - move both logics into the selector joiner visitor
            if (i > 0 && selectorElements.length && selectorElements[0].combinator.value === '') {
                selectorElements[0].combinator.value = ' ';
            }
            selfElements = selfElements.concat(selectors[i].elements);
        }

        this.selfSelectors = [new Selector(selfElements)];
        this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo());
    }
});

Extend.next_id = 0;
export default Extend;
