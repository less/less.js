import Node from './node.js';

const UnicodeDescriptor = function(value) {
    this.value = value;
}

UnicodeDescriptor.prototype = Object.assign(new Node(), {
    type: 'UnicodeDescriptor'
})

export default UnicodeDescriptor;
