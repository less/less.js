(function(tree) {

tree.Selector = function(elements) {
    this.elements = elements;
    this.filters = [];
};

/**
 * Determine the specificity of this selector
 * based on the specificity of its elements - calling
 * Element.specificity() in order to do so
 */
tree.Selector.prototype.specificity = function() {
    return _.reduce(this.elements, function(memo, e) {
        var spec = e.specificity();
        memo[0] += spec[0];
        memo[1] += spec[1];
        return memo;
    }, [0, 0, this.filters.length]);
};

/**
 * Determine whether this selector matches a given id
 * and array of classes, by determining whether
 * all elements it contains match.
 */
tree.Selector.prototype.matches = function(id, classes) {
    for (var i = 0; i < this.elements.length; i++) {
        if (!this.elements[i].matches(id, classes)) {
            return false;
        }
    }
    return true;
};

tree.Selector.prototype.toCSS = function(env) {
    if (this._css) { return this._css }

    var sel = this.elements.map(function(f) {
        return f.toCSS(env).trim();
    }).join('_');

    return this._css = sel;
};

})(require('mess/tree'));
