// @ts-check
/** @import { EvalContext, CSSOutput, FileInfo } from './node.js' */
/** @import { DebugInfoContext } from './debug-info.js' */
import Node from './node.js';
import getDebugInfo from './debug-info.js';

class Comment extends Node {
    get type() { return 'Comment'; }

    /**
     * @param {string} value
     * @param {boolean} isLineComment
     * @param {number} index
     * @param {FileInfo} currentFileInfo
     */
    constructor(value, isLineComment, index, currentFileInfo) {
        super();
        this.value = value;
        this.isLineComment = isLineComment;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
        /** @type {{ lineNumber: number, fileName: string } | undefined} */
        this.debugInfo = undefined;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        if (this.debugInfo) {
            output.add(getDebugInfo(context, /** @type {DebugInfoContext} */ (this)), this.fileInfo(), this.getIndex());
        }
        output.add(/** @type {string} */ (this.value));
    }

    /**
     * @param {EvalContext} context
     * @returns {boolean}
     */
    isSilent(context) {
        const isCompressed = context.compress && /** @type {string} */ (this.value)[2] !== '!';
        return this.isLineComment || isCompressed;
    }
}

export default Comment;
