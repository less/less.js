(function(tree) {

tree.Element = function Element(value) {
    this.value = value.trim();
};

/**
 * Determine the 'specificity matrix' of this
 * specific selector
 *
 * TODO: incorporate filters
 */
tree.Element.prototype.specificity = function() {
    return [
        (this.value[0] == '#') ? 1 : 0, // a
        (this.value[0] == '.') ? 1 : 0  // b
    ];
};

/**
 * Determine whether this element matches an id or classes.
 * An element is a single id or class, or check whether the given
 * array of classes contains this, or the id is equal to this.
 *
 * Takes a plain string for id and plain strings in the array of
 * classes.
 */
tree.Element.prototype.matches = function(id, classes) {
    return (classes.indexOf(this.value.replace(/^\./, '')) !== -1) ||
        (this.value.replace(/^#/, '') == id);
};

})(require('mess/tree'));
