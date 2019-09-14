import Node from '../node';

/** @todo - remove */
class UnicodeDescriptor extends Node {
    constructor(value) {
        super();

        this.value = value;
    }
}

UnicodeDescriptor.prototype.type = 'UnicodeDescriptor';

export default UnicodeDescriptor;
