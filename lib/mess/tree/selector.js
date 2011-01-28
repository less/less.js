var assert = require('assert');

(function(tree) {

tree.Selector = function Selector(elements, filters, zoom, attachment, conditions, index) {
    this.elements = elements || [];
    this.attachment = attachment || '__default__';
    this.filters = filters;
    this.zoom = zoom;
    this.conditions = conditions;
    this.index = index;
    this.updateID();
};

tree.Selector.prototype.updateID = function() {
    var filters = Object.keys(this.filters);
    filters.sort();
    return this.id = (this.zoom & tree.Zoom.all) + '#' + filters.join('#');
};

tree.Selector.prototype.debug = function() {
    var num = this.index < 10 ? '   ' + this.index :
                this.index < 100 ? '  ' + this.index :
                this.index < 1000 ? ' ' + this.index :
                this.index;

    var str = "[" + num + "] " + this.elements.join('');
    if (this.attachment !== '__default__') str += '::' + this.attachment;
    str += ': Zoom[' + tree.Zoom.toString(this.zoom) + '] ';
    for (var id in this.filters) {
        str += this.filters[id] + ' ';
    }
    return str;
};

tree.Selector.prototype.sound = function() {
    if (!this.zoom) return false;
    return tree.Filter.sound(this.filters);
};

tree.Selector.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.elements = this.elements.slice();
    obj.attachment = this.attachment;
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

tree.Selector.prototype.merge = function(obj) {
    Array.prototype.push.apply(this.elements, obj.elements);
    for (var id in obj.filters) {
        this.filters[id] = obj.filters[id];
    }
    if (obj.attachment) this.attachment = obj.attachment;
    this.index = obj.index;
    this.zoom &= obj.zoom;
    this.conditions += obj.conditions;
    this.updateID();
    return this;
};

/**
 * Returns an array with split conditions, integrating the conditions of the
 * passed object into itself. When the passed object has multiple conditions,
 * it splits up the selector and creates one for each condition.
 */
tree.Selector.prototype.mergeOrConditions = function(obj) {
    var result = {};

    if (Object.keys(obj.filters).length) {
        if (obj.zoom != tree.Zoom.all) {
            var clone = this.clone();
            clone.zoom &= obj.zoom;
            if (clone.sound()) result[clone.updateID()] = clone;

            var negatedZoom = ~obj.zoom;
            for (var id in obj.filters) {
                var selector = this.clone();
                selector.filters[id] = obj.filters[id];
                selector.zoom &= negatedZoom;
                if (selector.sound()) {
                    tree.Filter.simplify(selector.filters);
                    result[selector.updateID()] = selector;
                }
            }
        } else {
            // No zoom conditions, just split the selectors for each filter in obj.
            for (var id in obj.filters) {
                var selector = this.clone();
                selector.filters[id] = obj.filters[id];
                if (selector.sound()) {
                    tree.Filter.simplify(selector.filters);
                    selector.updateID();
                    result[selector.updateID()] = selector;
                }
            }
        }
    } else {
        var clone = this.clone();
        clone.zoom &= obj.zoom;
        if (clone.sound()) {
            tree.Filter.simplify(clone.filters);
            clone.updateID();
            result[clone.updateID()] = clone;
        }
    }

    var arr = [];
    for (var id in result) arr.push(result[id]);
    return arr;
};

tree.Selector.prototype.isIncludedIn = function(other) {
    for (var id in this.filters) {
        if (!(id in other.filters)) return false;
    }
    return true;
};

tree.Selector.prototype.includesZoomOf = function(other) {
    return (this.zoom | other.zoom) == other.zoom;
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
    obj.conditions = this.conditions
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
