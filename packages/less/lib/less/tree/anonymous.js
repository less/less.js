// @ts-check
/** @import { EvalContext, CSSOutput, FileInfo, VisibilityInfo } from './node.js' */
import Node from './node.js';

class Anonymous extends Node {
    get type() { return 'Anonymous'; }

    /**
     * @param {string | null} value
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {boolean} [mapLines]
     * @param {boolean} [rulesetLike]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(value, index, currentFileInfo, mapLines, rulesetLike, visibilityInfo) {
        super();
        this.value = value;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.mapLines = mapLines;
        this.rulesetLike = (typeof rulesetLike === 'undefined') ? false : rulesetLike;
        this.allowRoot = true;
        this.copyVisibilityInfo(visibilityInfo);
    }

    /** @returns {Anonymous} */
    eval() {
        return new Anonymous(/** @type {string | null} */ (this.value), this._index, this._fileInfo, this.mapLines, this.rulesetLike, this.visibilityInfo());
    }

    /**
     * @param {Node} other
     * @returns {number | undefined}
     */
    compare(other) {
        return other.toCSS && this.toCSS(/** @type {EvalContext} */ ({})) === other.toCSS(/** @type {EvalContext} */ ({})) ? 0 : undefined;
    }

    /** @returns {boolean} */
    isRulesetLike() {
        return this.rulesetLike;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        this.nodeVisible = Boolean(this.value);
        if (this.nodeVisible) {
            output.add(/** @type {string} */ (this.value), this._fileInfo, this._index, this.mapLines);
        }
    }
}

export default Anonymous;
