(function(tree) {

tree.Selector = function(elements, index) {
    this.elements = elements;
    this.filters = [];
    this.filters = [];
    this.index = index;
};

/**
 * Determine the specificity of this selector
 * based on the specificity of its elements - calling
 * Element.specificity() in order to do so
 *
 * [ID, Class, Filters, Position in document]
 */
tree.Selector.prototype.specificity = function() {
    return this.elements.reduce(function(memo, e) {
        var spec = e.specificity();
        memo[0] += spec[0];
        memo[1] += spec[1];
        return memo;
    }, [0, 0, this.filters.length, this.index]);
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
        return f.value;
    }).join('_');

    return this._css = sel;
};

tree.Selector.prototype.combinedFilter = function() {
    var normal_filters = this.filters.filter(
        function(f) {
            return f instanceof tree.Filter;
    });

    var zoom_filters = this.filters.filter(
        function(f) {
            return f instanceof tree.ZoomFilter;
    });

    return normal_filters.length ?
        '<Filter>' + normal_filters.map(function(f) {
            return '(' + f.toXML().trim() + ')';
        }).join(' and ') + '</Filter>'
        : '<ElseFilter/>';
};

})(require('mess/tree'));
