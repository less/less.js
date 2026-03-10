// @ts-check
/** @import { EvalContext, CSSOutput, FileInfo } from './node.js' */
import Node from './node.js';
import Value from './value.js';
import Keyword from './keyword.js';
import Anonymous from './anonymous.js';
import * as Constants from '../constants.js';
const MATH = Constants.Math;

/**
 * @param {EvalContext} context
 * @param {Node[]} name
 * @returns {string}
 */
function evalName(context, name) {
    let value = '';
    let i;
    const n = name.length;
    /** @type {CSSOutput} */
    const output = {add: function (s) {value += s;}, isEmpty: function() { return value === ''; }};
    for (i = 0; i < n; i++) {
        name[i].eval(context).genCSS(context, output);
    }
    return value;
}

class Declaration extends Node {
    get type() { return 'Declaration'; }

    /**
     * @param {string | Node[]} name
     * @param {Node | string | null} value
     * @param {string} [important]
     * @param {string} [merge]
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {boolean} [inline]
     * @param {boolean} [variable]
     */
    constructor(name, value, important, merge, index, currentFileInfo, inline, variable) {
        super();
        this.name = name;
        this.value = (value instanceof Node) ? value : new Value([value ? new Anonymous(value) : null]);
        this.important = important ? ` ${important.trim()}` : '';
        /** @type {string | undefined} */
        this.merge = merge;
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {boolean} */
        this.inline = inline || false;
        /** @type {boolean} */
        this.variable = (variable !== undefined) ? variable
            : (typeof name === 'string' && name.charAt(0) === '@');
        /** @type {boolean} */
        this.allowRoot = true;
        this.setParent(this.value, this);
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add(/** @type {string} */ (this.name) + (context.compress ? ':' : ': '), this.fileInfo(), this.getIndex());
        try {
            /** @type {Node} */ (this.value).genCSS(context, output);
        }
        catch (e) {
            const err = /** @type {{ index?: number, filename?: string }} */ (e);
            err.index = this._index;
            err.filename = this._fileInfo && this._fileInfo.filename;
            throw e;
        }
        output.add(this.important + ((this.inline || (context.lastRule && context.compress)) ? '' : ';'), this._fileInfo, this._index);
    }

    /** @param {EvalContext} context */
    eval(context) {
        let mathBypass = false, prevMath, name = this.name, evaldValue, variable = this.variable;
        if (typeof name !== 'string') {
            // expand 'primitive' name directly to get
            // things faster (~10% for benchmark.less):
            name = (/** @type {Node[]} */ (name).length === 1) && (/** @type {Node[]} */ (name)[0] instanceof Keyword) ?
                /** @type {string} */ (/** @type {Node[]} */ (name)[0].value) : evalName(context, /** @type {Node[]} */ (name));
            variable = false; // never treat expanded interpolation as new variable name
        }

        // @todo remove when parens-division is default
        if (name === 'font' && context.math === MATH.ALWAYS) {
            mathBypass = true;
            prevMath = context.math;
            context.math = MATH.PARENS_DIVISION;
        }
        try {
            context.importantScope.push({});
            evaldValue = /** @type {Node} */ (this.value).eval(context);

            if (!this.variable && evaldValue.type === 'DetachedRuleset') {
                throw { message: 'Rulesets cannot be evaluated on a property.',
                    index: this.getIndex(), filename: this.fileInfo().filename };
            }
            let important = this.important;
            const importantResult = context.importantScope.pop();
            if (!important && importantResult && importantResult.important) {
                important = importantResult.important;
            }

            return new Declaration(/** @type {string} */ (name),
                evaldValue,
                important,
                this.merge,
                this.getIndex(), this.fileInfo(), this.inline,
                variable);
        }
        catch (e) {
            const err = /** @type {{ index?: number, filename?: string }} */ (e);
            if (typeof err.index !== 'number') {
                err.index = this.getIndex();
                err.filename = this.fileInfo().filename;
            }
            throw e;
        }
        finally {
            if (mathBypass) {
                context.math = prevMath;
            }
        }
    }

    makeImportant() {
        return new Declaration(this.name,
            /** @type {Node} */ (this.value),
            '!important',
            this.merge,
            this.getIndex(), this.fileInfo(), this.inline);
    }
}

export default Declaration;
