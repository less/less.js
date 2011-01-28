var assert = require('assert');

(function(tree) {

tree.Selector = function Selector(elements, filters, zoom, attachment, conditions, index) {
    this.elements = elements || [];
    if (attachment) this.attachment = attachment;
    this.filters = filters || {};
    this.zoom = typeof zoom != 'undefined' ? zoom : tree.Zoom.all;
    this.conditions = conditions || 0;
    this.index = index || 0;
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
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.elements = this.elements.slice();
    if (this.attachment) obj.attachment = this.attachment;
    obj.filters = {};
    for (var id in this.filters) {
        obj.filters[id] = this.filters[id];
    }
    obj.zoom = this.zoom;
    obj.conditions = this.conditions;
    obj.index = this.index;
    obj.updateID();
    return obj;
};

tree.Selector.prototype.cloneMerge = function(other) {
    var zoom = this.zoom & other.zoom;
    if (!zoom) return;

    var filters = {};
    for (var id in this.filters) filters[id] = this.filters[id];
    for (var id in other.filters) filters[id] = other.filters[id];
    if (!tree.Filter.sound(filters)) return;

    return new tree.Selector(this.elements, filters, zoom, this.attachment, this.conditions, this.index);
};

tree.Selector.prototype.negate = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.elements = this.elements.slice();
    obj.attachment = this.attachment;
    obj.filters = {};
    for (var id in this.filters) {
        var negated = this.filters[id].negate();
        obj.filters[negated.id] = negated;
    }
    obj.zoom = ~this.zoom;
    obj.conditions = this.conditions;
    obj.index = this.index;
    obj.updateID();
    return obj;
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
