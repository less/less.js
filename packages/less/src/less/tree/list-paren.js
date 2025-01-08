import Node from './node';

const ListParen = function(node) {
    this.value = node;
};

ListParen.prototype = Object.assign(new Node(), {
    type: 'ListParen',

    genCSS(context, output) {
        output.add('(');
        this.value.forEach(val => val.genCSS(context, output));
        output.add(')');
    },

    eval(context) {
        return new ListParen(this.value.map(val => val.eval(context)));
    }
});

export default ListParen;
