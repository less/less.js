import Node from './node.js';

class Keyword extends Node {
    get type() { return 'Keyword'; }

    constructor(value) {
        super();
        this.value = value;
    }

    genCSS(context, output) {
        if (this.value === '%') { throw { type: 'Syntax', message: 'Invalid % without number' }; }
        output.add(this.value);
    }
}

Keyword.True = new Keyword('true');
Keyword.False = new Keyword('false');

export default Keyword;
