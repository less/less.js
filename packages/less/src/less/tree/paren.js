import Node from './node';

const Paren = function(node) {
    this.value = node;
};

Paren.prototype = new Node();

Paren.prototype.genCSS = function(context, output) {
    output.add('(');
    this.value.genCSS(context, output);
    output.add(')');
}

Paren.prototype.eval = function(context) {
    return new Paren(this.value.eval(context));
};

Paren.prototype.type = 'Paren';
export default Paren;
