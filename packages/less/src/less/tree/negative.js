import Node from './node';
import Operation from './operation';
import Dimension from './dimension';

const Negative = function(node) {
    this.value = node;
};

Negative.prototype = Object.assign(new Node(), {
    type: 'Negative',

    genCSS(context, output) {
        output.add('-');
        this.value.genCSS(context, output);
    },

    eval(context) {
        if (context.isMathOn()) {
            return (new Operation('*', [new Dimension(-1), this.value])).eval(context);
        }
        return new Negative(this.value.eval(context));
    }
});

export default Negative;
