import JsEvalNode from "./js-eval-node";
import Dimension from "./dimension";
import Quoted from "./quoted";
import Anonymous from "./anonymous";

export default class JavaScript extends JsEvalNode {
    constructor(string, escaped, index, currentFileInfo) {
        super();
        this.escaped = escaped;
        this.expression = string;
        this._index = index;
        this._fileInfo = currentFileInfo;
    }

    eval(context) {
        const result = this.evaluateJavaScript(this.expression, context);

        if (typeof result === 'number') {
            return new Dimension(result);
        } else if (typeof result === 'string') {
            return new Quoted('"' + result + '"', result, this.escaped, this._index);
        } else if (Array.isArray(result)) {
            return new Anonymous(result.join(', '));
        } else {
            return new Anonymous(result);
        }
    }
}

JavaScript.prototype.type = "JavaScript";
