(function(tree) {

tree.Selector = function(elements, filters, attachment, index) {
    this.elements = elements;
    this.attachment = attachment || '__default__';
    this.filters = filters;
    this.index = index;
};

tree.Selector.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.elements = this.elements.slice();
    obj.attachment = this.attachment;
    obj.filters = this.filters.slice();
    obj.index = this.index;
    if (this.zoom) {
        obj.zoom = this.zoom.clone();
    }
    return obj;
}

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

tree.Selector.prototype.layers = function(env) {
    return this.elements.map(function(f) {
        return f.value;
    }).join(' ');
};

tree.Selector.prototype.combinedFilter = function(env) {
    var filters = this.zoom ? this.zoom.toXML() : [];
    
    if (this.filters.length) {
        filters.push('<Filter>' + this.filters.map(function(f) {
            // TODO: this is required to support selectors
            // that haven't been processed in the render() function.
            if (f instanceof tree.Filter) {
                return '(' + f.toXML(env).trim() + ')';
            }
        }).join(' and ') + '</Filter>');
    }

    return filters.length ? filters.join('\n    ') : '<ElseFilter/>';
};

})(require('mess/tree'));
