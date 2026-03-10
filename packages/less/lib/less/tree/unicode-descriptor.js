// @ts-check
import Node from './node.js';

class UnicodeDescriptor extends Node {
    get type() { return 'UnicodeDescriptor'; }

    /** @param {string} value */
    constructor(value) {
        super();
        this.value = value;
    }
}

export default UnicodeDescriptor;
