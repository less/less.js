import Node from './node';

const Paren = function(node) {
    this.value = node;
};

Paren.prototype = Object.assign(new Node(), {
    type: 'Paren',

    genCSS(context, output) {
        output.add('(');
        this.value.genCSS(context, output);
        output.add(')');
    },

    eval(context) {
        return new Paren(this.value.eval(context));
    }
});

export default Paren;
