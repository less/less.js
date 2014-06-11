(function(tree) {

// An element is an id or class selector
tree.Element = function Element(value) {
    this.value = value.trim();
    if (this.value[0] === '#') {
        this.type = 'id';
        this.clean = this.value.replace(/^#/, '');
    }
    if (this.value[0] === '.') {
        this.type = 'class';
        this.clean = this.value.replace(/^\./, '');
    }
    if (this.value.indexOf('*') !== -1) {
        this.type = 'wildcard';
    }
};

// Determine the 'specificity matrix' of this
// specific selector
tree.Element.prototype.specificity = function() {
    return [
        (this.type === 'id') ? 1 : 0, // a
        (this.type === 'class') ? 1 : 0  // b
    ];
};

tree.Element.prototype.toString = function() { return this.value; };

})(require('../tree'));
