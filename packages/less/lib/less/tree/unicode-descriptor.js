import Node from './node.js';

class UnicodeDescriptor extends Node {
    get type() { return 'UnicodeDescriptor'; }

    constructor(value) {
        super();
        this.value = value;
    }
}

export default UnicodeDescriptor;
