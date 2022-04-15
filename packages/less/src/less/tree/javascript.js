import JsEvalNode from './js-eval-node.js';
import Dimension from './dimension.js';
import Quoted from './quoted.js';
import Anonymous from './anonymous.js';

const JavaScript = function(string, escaped, index, currentFileInfo) {
    this.escaped = escaped;
    this.expression = string;
    this._index = index;
    this._fileInfo = currentFileInfo;
}

JavaScript.prototype = Object.assign(new JsEvalNode(), {
    type: 'JavaScript',

    eval(context) {
        const result = this.evaluateJavaScript(this.expression, context);
        const type = typeof result;

        if (type === 'number' && !isNaN(result)) {
            return new Dimension(result);
        } else if (type === 'string') {
            return new Quoted(`"${result}"`, result, this.escaped, this._index);
        } else if (Array.isArray(result)) {
            return new Anonymous(result.join(', '));
        } else {
            return new Anonymous(result);
        }
    }
});

export default JavaScript;
