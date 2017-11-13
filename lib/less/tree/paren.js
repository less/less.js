import Node from "./node";

export default class Paren extends Node {
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
        return new Paren(this.value.eval(context));
    }
}

Paren.prototype.type = "Paren";
