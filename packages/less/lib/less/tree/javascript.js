// @ts-check
/** @import { EvalContext, FileInfo } from './node.js' */
import JsEvalNode from './js-eval-node.js';
import Dimension from './dimension.js';
import Quoted from './quoted.js';
import Anonymous from './anonymous.js';

class JavaScript extends JsEvalNode {
    get type() { return 'JavaScript'; }

    /**
     * @param {string} string
     * @param {boolean} escaped
     * @param {number} index
     * @param {FileInfo} currentFileInfo
     */
    constructor(string, escaped, index, currentFileInfo) {
        super();
        this.escaped = escaped;
        this.expression = string;
        this._index = index;
        this._fileInfo = currentFileInfo;
    }

    /**
     * @param {EvalContext} context
     * @returns {Dimension | Quoted | Anonymous}
     */
    eval(context) {
        const result = this.evaluateJavaScript(this.expression, context);
        const type = typeof result;

        if (type === 'number' && !isNaN(/** @type {number} */ (result))) {
            return new Dimension(/** @type {number} */ (result));
        } else if (type === 'string') {
            return new Quoted(`"${result}"`, /** @type {string} */ (result), this.escaped, this._index);
        } else if (Array.isArray(result)) {
            return new Anonymous(/** @type {string[]} */ (result).join(', '));
        } else {
            return new Anonymous(/** @type {string} */ (result));
        }
    }
}

export default JavaScript;
