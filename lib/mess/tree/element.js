(function(tree) {

tree.Element = function(combinator, value) {
    this.combinator = combinator instanceof tree.Combinator ?
                      combinator : new(tree.Combinator)(combinator);
    this.value = value.toCSS ? value.toCSS() : value.trim();
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
 * Transform element names into friendlier element names
 */
tree.Element.prototype.toCSS = function(env) {
    return this.combinator.toCSS() + this.value;
};

tree.Element.prototype.match = function(id, classes) {
    return (this.value in classes) || (this.value == id);
};

tree.Combinator = function(value) {
    if (value === ' ') {
        this.value = ' ';
    } else {
        this.value = value ? value.trim() : '';
    }
};

tree.Combinator.prototype.toCSS = function() {
    return {
        '' : '',
        ' ' : ' ',
        '&' : '',
        ':' : ' :',
        '::': '::',
        '+' : '+',
        '~' : '~',
        '>' : '>'
    }[this.value];
};

})(require('mess/tree'));
