(function(tree) {

tree.Selector = function Selector(elements, filters, zoom, attachment, index) {
    this.elements = elements || [];
    this.attachment = attachment || '__default__';
    this.filters = filters || [];
    this.zoom = zoom;
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
    var zoomSpecificity = this.zoom ? this.zoom.specificity : 0;
    return this.elements.reduce(function(memo, e) {
        var spec = e.specificity();
        memo[0] += spec[0];
        memo[1] += spec[1];
        return memo;
    }, [0, 0, this.filters.length + zoomSpecificity, this.index]);
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

tree.Selector.prototype.simplifiedFilters = function() {
    var simplified = [];
    filters: for (var i = 0; i < this.filters.length; i++) {
        // Operate from the back so that we don't run into renumbering problems
        // when deleting items from the array.
        for (var j = simplified.length - 1; j >= 0; j--) {
            if (simplified[j].overrides(this.filters[i])) {
                continue filters;
            }
            else if (this.filters[i].overrides(simplified[j])) {
                simplified.splice(j, 1);
            }
        }
        simplified.push(this.filters[i]);
    }
    return simplified;
};

tree.Selector.prototype.combinedFilter = function(env) {
    var conditions = [];

    if (this.zoom) {
        conditions = this.zoom.toXML()
    }

    var filters = this.simplifiedFilters().map(function(filter) {
        return '(' + filter.toXML(env).trim() + ')';
    });

    if (filters.length) {
        conditions.push('<Filter>' + filters.join(' and ') + '</Filter>');
    }

    if (conditions.length) {
        return conditions.join('\n    ');
    } else {
        return '<ElseFilter/>';
    }
};

})(require('mess/tree'));
