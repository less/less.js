import Node from './node.js';

class Paren extends Node {
    get type() { return 'Paren'; }

    constructor(node) {
        super();
        this.value = node;
    }

    genCSS(context, output) {
        output.add('(');
        this.value.genCSS(context, output);
        output.add(')');
    }

    eval(context) {
        const paren = new Paren(this.value.eval(context));

        if (this.noSpacing) {
            paren.noSpacing = true;
        }

        return paren;
    }
}

export default Paren;
