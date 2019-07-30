import Node from './node';

class UnicodeDescriptor extends Node {
    constructor(value) {
        this.value = value;
    }
}

UnicodeDescriptor.prototype.type = 'UnicodeDescriptor';

export default UnicodeDescriptor;
