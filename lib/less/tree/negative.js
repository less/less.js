import Node from './node';
import Operation from './operation';
import Dimension from './dimension';

class Negative extends Node {
    constructor(node, currentFileInfo) {
        super();

        this.value = node;
        this._fileInfo = currentFileInfo;
    }

    genCSS(context, output) {
        output.add('-');
        this.value.genCSS(context, output);
    }

    eval(context) {
        if (context.isMathOn()) {
            return (new Operation('*', [new Dimension(-1), this.value], this.currentFileInfo)).eval(context);
        }
        return new Negative(this.value.eval(context));
    }
}

Negative.prototype.type = 'Negative';
export default Negative;
