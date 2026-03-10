// @ts-check
/**
 * @typedef {object} FileInfo
 * @property {string} [filename]
 * @property {string} [rootpath]
 * @property {string} [currentDirectory]
 * @property {string} [rootFilename]
 * @property {string} [entryPath]
 * @property {boolean} [reference]
 */

/**
 * @typedef {object} VisibilityInfo
 * @property {number} [visibilityBlocks]
 * @property {boolean} [nodeVisible]
 */

/**
 * @typedef {object} CSSOutput
 * @property {(chunk: string, fileInfo?: FileInfo, index?: number, mapLines?: boolean) => void} add
 * @property {() => boolean} isEmpty
 */

/**
 * @typedef {object} EvalContext
 * @property {number} [numPrecision]
 * @property {(op?: string) => boolean} [isMathOn]
 * @property {number} [math]
 * @property {Node[]} [frames]
 * @property {Array<{important?: string}>} [importantScope]
 * @property {string[]} [paths]
 * @property {boolean} [compress]
 * @property {boolean} [strictUnits]
 * @property {boolean} [sourceMap]
 * @property {boolean} [importMultiple]
 * @property {string} [urlArgs]
 * @property {boolean} [javascriptEnabled]
 * @property {object} [pluginManager]
 * @property {number} [rewriteUrls]
 * @property {boolean} [inCalc]
 * @property {boolean} [mathOn]
 * @property {boolean[]} [calcStack]
 * @property {boolean[]} [parensStack]
 * @property {Node[]} [mediaBlocks]
 * @property {Node[]} [mediaPath]
 * @property {() => void} [inParenthesis]
 * @property {() => void} [outOfParenthesis]
 * @property {() => void} [enterCalc]
 * @property {() => void} [exitCalc]
 * @property {(path: string) => boolean} [pathRequiresRewrite]
 * @property {(path: string, rootpath?: string) => string} [rewritePath]
 * @property {(path: string) => string} [normalizePath]
 * @property {number} [tabLevel]
 * @property {boolean} [lastRule]
 */

/**
 * @typedef {object} TreeVisitor
 * @property {(node: Node) => Node} visit
 * @property {(nodes: Node[], nonReplacing?: boolean) => Node[]} visitArray
 */

/**
 * The reason why Node is a class and other nodes simply do not extend
 * from Node (since we're transpiling) is due to this issue:
 *
 * @see https://github.com/less/less.js/issues/3434
 */
class Node {
    get type() { return ''; }

    constructor() {
        /** @type {Node | null} */
        this.parent = null;
        /** @type {number | undefined} */
        this.visibilityBlocks = undefined;
        /** @type {boolean | undefined} */
        this.nodeVisible = undefined;
        /** @type {Node | null} */
        this.rootNode = null;
        /** @type {Node | null} */
        this.parsed = null;

        /** @type {Node | Node[] | string | number | undefined} */
        this.value = undefined;
        /** @type {number | undefined} */
        this._index = undefined;
        /** @type {FileInfo | undefined} */
        this._fileInfo = undefined;
    }

    get currentFileInfo() {
        return this.fileInfo();
    }

    get index() {
        return this.getIndex();
    }

    /**
     * @param {Node | Node[]} nodes
     * @param {Node} parent
     */
    setParent(nodes, parent) {
        /** @param {Node} node */
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

    /** @returns {number} */
    getIndex() {
        return this._index || (this.parent && this.parent.getIndex()) || 0;
    }

    /** @returns {FileInfo} */
    fileInfo() {
        return this._fileInfo || (this.parent && this.parent.fileInfo()) || {};
    }

    /** @returns {boolean} */
    isRulesetLike() { return false; }

    /**
     * @param {EvalContext} context
     * @returns {string}
     */
    toCSS(context) {
        /** @type {string[]} */
        const strs = [];
        this.genCSS(context, {
            add: function(chunk, fileInfo, index) {
                strs.push(chunk);
            },
            isEmpty: function () {
                return strs.length === 0;
            }
        });
        return strs.join('');
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add(/** @type {string} */ (this.value));
    }

    /**
     * @param {TreeVisitor} visitor
     */
    accept(visitor) {
        this.value = visitor.visit(/** @type {Node} */ (this.value));
    }

    /**
     * @param {EvalContext} [context]
     * @returns {Node}
     */
    eval(context) { return this; }

    /**
     * @param {EvalContext} context
     * @param {string} op
     * @param {number} a
     * @param {number} b
     * @returns {number | undefined}
     */
    _operate(context, op, a, b) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
        }
    }

    /**
     * @param {EvalContext} context
     * @param {number} value
     * @returns {number}
     */
    fround(context, value) {
        const precision = context && context.numPrecision;
        // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
        return (precision) ? Number((value + 2e-16).toFixed(precision)) : value;
    }

    /**
     * @param {Node & { compare?: (other: Node) => number | undefined }} a
     * @param {Node & { compare?: (other: Node) => number | undefined }} b
     * @returns {number | undefined}
     */
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

        let aVal = a.value;
        let bVal = b.value;
        if (!Array.isArray(aVal)) {
            return aVal === bVal ? 0 : undefined;
        }
        if (!Array.isArray(bVal)) {
            return undefined;
        }
        if (aVal.length !== bVal.length) {
            return undefined;
        }
        for (let i = 0; i < aVal.length; i++) {
            if (Node.compare(aVal[i], bVal[i]) !== 0) {
                return undefined;
            }
        }
        return 0;
    }

    /**
     * @param {number | string} a
     * @param {number | string} b
     * @returns {number | undefined}
     */
    static numericCompare(a, b) {
        return a  <  b ? -1
            : a === b ?  0
                : a  >  b ?  1 : undefined;
    }

    /** @returns {boolean} */
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

    ensureVisibility() {
        this.nodeVisible = true;
    }

    ensureInvisibility() {
        this.nodeVisible = false;
    }

    /** @returns {boolean | undefined} */
    isVisible() {
        return this.nodeVisible;
    }

    /** @returns {VisibilityInfo} */
    visibilityInfo() {
        return {
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible
        };
    }

    /** @param {VisibilityInfo} info */
    copyVisibilityInfo(info) {
        if (!info) {
            return;
        }
        this.visibilityBlocks = info.visibilityBlocks;
        this.nodeVisible = info.nodeVisible;
    }
}

/**
 * Set by the parser at runtime on Node.prototype.
 * @type {{ context: EvalContext, importManager: object, imports: object } | undefined}
 */
Node.prototype.parse = undefined;

export default Node;
