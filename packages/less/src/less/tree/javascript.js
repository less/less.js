import JsEvalNode from './js-eval-node';
import Dimension from './dimension';
import Quoted from './quoted';
import Anonymous from './anonymous';

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
