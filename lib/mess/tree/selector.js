var assert = require('assert');

(function(tree) {

tree.Selector = function Selector(filters, zoom, elements, attachment, conditions, index) {
    this.elements = elements || [];
    this.attachment = attachment;
    this.filters = filters || {};
    this.zoom = typeof zoom !== 'undefined' ? zoom : tree.Zoom.all;
    this.conditions = conditions;
    this.index = index;
    this.updateID();
};

tree.Selector.prototype.updateID = function() {
    var filters = Object.keys(this.filters);
    filters.sort();
    this.filterID = filters.join('#');
    return this.id = (this.zoom & tree.Zoom.all) + '#' + this.filterID;
};

tree.Selector.prototype.debug = function() {
    var num = this.index < 10 ? '   ' + this.index :
                this.index < 100 ? '  ' + this.index :
                this.index < 1000 ? ' ' + this.index :
                this.index;

    var str = "[" + num + "] " + this.elements.join('');
    if (this.attachment) str += '::' + this.attachment;
    str += ': Zoom[' + tree.Zoom.toString(this.zoom) + '] ';
    var filters = Object.keys(this.filters);
    filters.sort();
    str += (filters.length ? '[' : '') + filters.join('] [') + (filters.length ? ']' : '');
    return str;
};

tree.Selector.prototype.sound = function() {
    if (!this.zoom) return false;
    return tree.Filter.sound(this.filters);
};

tree.Selector.prototype.clone = function() {
    var clone = Object.create(tree.Selector.prototype);
    if (this.elements) {
        // Do a full clone.
        clone.elements = this.elements.slice();
        if (this.attachment) clone.attachment = this.attachment;
        clone.conditions = this.conditions;
        clone.index = this.index;
    }
    clone.filters = {};
    for (var id in this.filters) { clone.filters[id] = this.filters[id]; }
    clone.zoom = this.zoom;
    clone.updateID();
    return clone;
};

tree.Selector.prototype.cloneMerge = function(other) {
    var zoom = this.zoom & other.zoom;
    if (!zoom) return;

    var filters = {};
    for (var id in this.filters) filters[id] = this.filters[id];
    for (var id in other.filters) filters[id] = other.filters[id];
    if (!tree.Filter.sound(filters)) return;

    // Create a lightweight object.
    var clone = Object.create(tree.Selector.prototype);
    clone.filters = filters;
    clone.zoom = zoom;
    return clone;
};

tree.Selector.prototype.negate = function() {
    var clone = Object.create(tree.Selector.prototype);
    if (this.elements) {
        // Do a full clone.
        clone.elements = this.elements.slice();
        clone.attachment = this.attachment;
        clone.conditions = this.conditions;
        clone.index = this.index;
    }
    clone.filters = {};
    for (var id in this.filters) {
        var negated = this.filters[id].negate();
        clone.filters[negated.id] = negated;
    }
    clone.zoom = ~this.zoom;
    clone.updateID();
    return clone;
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
    }, [0, 0, this.conditions, this.index]);
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
    var conditions = tree.Zoom.toXML(this.zoom);

    var filters = [];
    for (var id in this.filters) {
        filters.push('(' + this.filters[id].toXML(env).trim() + ')');
    }

    if (filters.length) {
        conditions.push('<Filter>' + filters.join(' and ') + '</Filter>');
    }

    if (conditions.length) {
        return conditions.join('\n    ');
    } else {
        return '';
    }
};

})(require('mess/tree'));
