// @ts-check
/** @import { EvalContext, CSSOutput, FileInfo } from './node.js' */
import Node from './node.js';
import Variable from './variable.js';
import Property from './property.js';

class Quoted extends Node {
    get type() { return 'Quoted'; }

    /**
     * @param {string} str
     * @param {string} [content]
     * @param {boolean} [escaped]
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     */
    constructor(str, content, escaped, index, currentFileInfo) {
        super();
        /** @type {boolean} */
        this.escaped = (escaped === undefined) ? true : escaped;
        /** @type {string} */
        this.value = content || '';
        /** @type {string} */
        this.quote = str.charAt(0);
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {RegExp} */
        this.variableRegex = /@\{([\w-]+)\}/g;
        /** @type {RegExp} */
        this.propRegex = /\$\{([\w-]+)\}/g;
        /** @type {boolean | undefined} */
        this.allowRoot = escaped;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        if (!this.escaped) {
            output.add(this.quote, this.fileInfo(), this.getIndex());
        }
        output.add(/** @type {string} */ (this.value));
        if (!this.escaped) {
            output.add(this.quote);
        }
    }

    /** @returns {RegExpMatchArray | null} */
    containsVariables() {
        return /** @type {string} */ (this.value).match(this.variableRegex);
    }

    /** @param {EvalContext} context */
    eval(context) {
        const that = this;
        let value = /** @type {string} */ (this.value);
        /**
         * @param {string} _
         * @param {string} name1
         * @param {string} name2
         * @returns {string}
         */
        const variableReplacement = function (_, name1, name2) {
            const v = new Variable(`@${name1 ?? name2}`, that.getIndex(), that.fileInfo()).eval(context);
            return (v instanceof Quoted) ? /** @type {string} */ (v.value) : v.toCSS(context);
        };
        /**
         * @param {string} _
         * @param {string} name1
         * @param {string} name2
         * @returns {string}
         */
        const propertyReplacement = function (_, name1, name2) {
            const v = new Property(`$${name1 ?? name2}`, that.getIndex(), that.fileInfo()).eval(context);
            return (v instanceof Quoted) ? /** @type {string} */ (v.value) : v.toCSS(context);
        };
        /**
         * @param {string} value
         * @param {RegExp} regexp
         * @param {(substring: string, ...args: string[]) => string} replacementFnc
         * @returns {string}
         */
        function iterativeReplace(value, regexp, replacementFnc) {
            let evaluatedValue = value;
            do {
                value = evaluatedValue.toString();
                evaluatedValue = value.replace(regexp, replacementFnc);
            } while (value !== evaluatedValue);
            return evaluatedValue;
        }
        value = iterativeReplace(value, this.variableRegex, variableReplacement);
        value = iterativeReplace(value, this.propRegex, propertyReplacement);
        return new Quoted(this.quote + value + this.quote, value, this.escaped, this.getIndex(), this.fileInfo());
    }

    /**
     * @param {Node} other
     * @returns {number | undefined}
     */
    compare(other) {
        // when comparing quoted strings allow the quote to differ
        if (other.type === 'Quoted' && !this.escaped && !/** @type {Quoted} */ (other).escaped) {
            return Node.numericCompare(
                /** @type {string} */ (this.value),
                /** @type {string} */ (other.value)
            );
        } else {
            return other.toCSS && this.toCSS(/** @type {EvalContext} */ ({})) === other.toCSS(/** @type {EvalContext} */ ({})) ? 0 : undefined;
        }
    }
}

export default Quoted;
