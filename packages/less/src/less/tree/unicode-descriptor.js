import Node from './node';

const UnicodeDescriptor = function(value) {
    this.value = value;
}

UnicodeDescriptor.prototype = new Node();
UnicodeDescriptor.prototype.type = 'UnicodeDescriptor';

export default UnicodeDescriptor;
