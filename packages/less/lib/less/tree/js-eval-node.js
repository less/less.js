// @ts-check
/** @import { EvalContext } from './node.js' */
import Node from './node.js';
import Variable from './variable.js';

class JsEvalNode extends Node {
    /**
     * @param {string} expression
     * @param {EvalContext} context
     * @returns {string | number | boolean}
     */
    evaluateJavaScript(expression, context) {
        let result;
        const that = this;
        /** @type {Record<string, { value: Node, toJS: () => string }>} */
        const evalContext = {};

        if (!context.javascriptEnabled) {
            throw { message: 'Inline JavaScript is not enabled. Is it set in your options?',
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }

        expression = expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
            return that.jsify(new Variable(`@${name}`, that.getIndex(), that.fileInfo()).eval(context));
        });

        /** @type {Function} */
        let expressionFunc;
        try {
            expressionFunc = new Function(`return (${expression})`);
        } catch (e) {
            throw { message: `JavaScript evaluation error: ${/** @type {Error} */ (e).message} from \`${expression}\`` ,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }

        const variables = /** @type {Node & { variables: () => Record<string, { value: Node }> }} */ (context.frames[0]).variables();
        for (const k in variables) {
            // eslint-disable-next-line no-prototype-builtins
            if (variables.hasOwnProperty(k)) {
                evalContext[k.slice(1)] = {
                    value: variables[k].value,
                    toJS: function () {
                        return this.value.eval(context).toCSS(context);
                    }
                };
            }
        }

        try {
            result = expressionFunc.call(evalContext);
        } catch (e) {
            throw { message: `JavaScript evaluation error: '${/** @type {Error} */ (e).name}: ${/** @type {Error} */ (e).message.replace(/["]/g, '\'')}'` ,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }
        return result;
    }

    /**
     * @param {Node} obj
     * @returns {string}
     */
    jsify(obj) {
        if (Array.isArray(obj.value) && (obj.value.length > 1)) {
            return `[${obj.value.map(function (v) { return v.toCSS(/** @type {EvalContext} */ (undefined)); }).join(', ')}]`;
        } else {
            return obj.toCSS(/** @type {EvalContext} */ (undefined));
        }
    }
}

export default JsEvalNode;
