/**
 * The reason why Node is a class and other nodes simply do not extend
 * from Node (since we're transpiling) is due to this issue:
 * 
 * @see https://github.com/less/less.js/issues/3434
 */
class Node {
    constructor() {
        this.parent = null;
        this.visibilityBlocks = undefined;
        this.nodeVisible = undefined;
        this.rootNode = null;
        this.parsed = null;
    }

    get currentFileInfo() {
        return this.fileInfo();
    }

    get index() {
        return this.getIndex();
    }

    setParent(nodes, parent) {
        function set(node) {
            if (node && node instanceof Node) {
                node.parent = parent;
            }
        }
        if (Array.isArray(nodes)) {
            nodes.forEach(set);
        }
        else {
            set(nodes);
        }
    }

    getIndex() {
        return this._index || (this.parent && this.parent.getIndex()) || 0;
    }

    fileInfo() {
        return this._fileInfo || (this.parent && this.parent.fileInfo()) || {};
    }

    isRulesetLike() { return false; }

    toCSS(context) {
        const strs = [];
        this.genCSS(context, {
            // remove when genCSS has JSDoc types
            // eslint-disable-next-line no-unused-vars
            add: function(chunk, fileInfo, index) {
                strs.push(chunk);
            },
            isEmpty: function () {
                return strs.length === 0;
            }
        });
        return strs.join('');
    }

    genCSS(context, output) {
        output.add(this.value);
    }

    accept(visitor) {
        this.value = visitor.visit(this.value);
    }

    eval() { return this; }

    _operate(context, op, a, b) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
        }
    }

    fround(context, value) {
        const precision = context && context.numPrecision;
        // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
        return (precision) ? Number((value + 2e-16).toFixed(precision)) : value;
    }

    static compare(a, b) {
        /* returns:
         -1: a < b
         0: a = b
         1: a > b
         and *any* other value for a != b (e.g. undefined, NaN, -2 etc.) */

        if ((a.compare) &&
            // for "symmetric results" force toCSS-based comparison
            // of Quoted or Anonymous if either value is one of those
            !(b.type === 'Quoted' || b.type === 'Anonymous')) {
            return a.compare(b);
        } else if (b.compare) {
            return -b.compare(a);
        } else if (a.type !== b.type) {
            return undefined;
        }

        a = a.value;
        b = b.value;
        if (!Array.isArray(a)) {
            return a === b ? 0 : undefined;
        }
        if (a.length !== b.length) {
            return undefined;
        }
        for (let i = 0; i < a.length; i++) {
            if (Node.compare(a[i], b[i]) !== 0) {
                return undefined;
            }
        }
        return 0;
    }

    static numericCompare(a, b) {
        return a  <  b ? -1
            : a === b ?  0
                : a  >  b ?  1 : undefined;
    }

    // Returns true if this node represents root of ast imported by reference
    blocksVisibility() {
        if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
        }
        return this.visibilityBlocks !== 0;
    }

    addVisibilityBlock() {
        if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
        }
        this.visibilityBlocks = this.visibilityBlocks + 1;
    }

    removeVisibilityBlock() {
        if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
        }
        this.visibilityBlocks = this.visibilityBlocks - 1;
    }

    // Turns on node visibility - if called node will be shown in output regardless
    // of whether it comes from import by reference or not
    ensureVisibility() {
        this.nodeVisible = true;
    }

    // Turns off node visibility - if called node will NOT be shown in output regardless
    // of whether it comes from import by reference or not
    ensureInvisibility() {
        this.nodeVisible = false;
    }

    // return values:
    // false - the node must not be visible
    // true - the node must be visible
    // undefined or null - the node has the same visibility as its parent
    isVisible() {
        return this.nodeVisible;
    }

    visibilityInfo() {
        return {
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible
        };
    }

    copyVisibilityInfo(info) {
        if (!info) {
            return;
        }
        this.visibilityBlocks = info.visibilityBlocks;
        this.nodeVisible = info.nodeVisible;
    }
}

export default Node;
