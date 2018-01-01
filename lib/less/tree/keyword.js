import Node from "./node";

class Keyword extends Node {
    static True = new Keyword('true');
    static False = new Keyword('false');

    constructor(value) {
        super();
        this.value = value;
    }

    genCSS(context, output) {
        if (this.value === '%') { throw { type: "Syntax", message: "Invalid % without number" }; }
        output.add(this.value);
    }
}

Keyword.prototype.type = "Keyword";

export default Keyword;
