var assert = require('assert');

(function(tree) {

tree.Selector = function Selector(elements, filters, zoom, attachment, index) {
    this.elements = elements || [];
    this.attachment = attachment || '__default__';
    this.filters = filters || [];
    this.zoom = zoom;
    this.index = index;
};

tree.Selector.prototype.debug = function() {
    var num = this.index < 10 ? '   ' + this.index :
                this.index < 100 ? '  ' + this.index :
                this.index < 1000 ? ' ' + this.index :
                this.index;

    var str = "[" + num + "] " + this.elements.join('');
    if (this.attachment !== '__default__') str += '::' + this.attachment;
    str += ': ';
    if (this.zoom) str += this.zoom;
    else str += '      (All zoom levels)     ';
    str += ' ' + this.filters.join(' ');
    return str;
};

tree.Selector.prototype.sound = function() {
    if (this.zoom && !this.zoom.sound()) return false;
    if (this.filters.length && !tree.Filter.sound(this.filters)) return false;
    return true;
};

tree.Selector.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.elements = this.elements.slice();
    obj.attachment = this.attachment;
    obj.index = this.index;

    obj.filters = this.filters.slice();
    if (this.zoom) {
        obj.zoom = this.zoom.clone();
    }
    return obj;
};

tree.Selector.prototype.merge = function(obj) {
    Array.prototype.push.apply(this.elements, obj.elements);
    Array.prototype.push.apply(this.filters, obj.filters);
    if (obj.attachment) this.attachment = obj.attachment;
    this.index = obj.index;

    if (this.zoom && obj.zoom) this.zoom.intersection(obj.zoom);
    else if (obj.zoom) this.zoom = obj.zoom.clone();
    return this;
};

/**
 * Returns an array with split conditions, integrating the conditions of the
 * passed object into itself. When the passed object has multiple conditions,
 * it splits up the selector and creates one for each condition.
 */
tree.Selector.prototype.mergeOrConditions = function(obj) {
    var result = [ this ];

    if (obj.filters.length) {
        if (obj.zoom) {
            var negatedZoom = obj.zoom.negate();
            for (var i = 0; i < obj.filters.length; i++) {
                var selector = this.clone();
                selector.filters.push(obj.filters[i]);
                if (!selector.zoom) selector.zoom = negatedZoom;
                else selector.zoom.intersection(negatedZoom);
                result.push(selector);
            }
        } else {
            // No zoom conditions, just split the selectors for each filter in obj.
            for (var i = 1; i < obj.filters.length; i++) {
                var selector = this.clone();
                selector.filters.push(obj.filters[i]);
                result.push(selector);
            }
            this.filters.push(obj.filters[0]);
        }
    }

    if (obj.zoom) {
        // The passed object doesn't have any filters.
        if (this.zoom) this.zoom.intersection(obj.zoom);
        else this.zoom = obj.zoom.clone();
    }

    // Simplify the resulting sound selectors.
    result = result.filter(function(selector) {
        if (selector.sound()) {
            selector.simplifyFilters();
            return true;
        }
    });


    // Check selectors for soundness before we return them.
    return result;
};

tree.Selector.prototype.simplifyFilters = function() {
    var simplified = [];
    var a, b;
    filters: for (var i = 0; i < this.filters.length; i++) {
        a = this.filters[i];
        // Operate from the back so that we don't run into renumbering problems
        // when deleting items from the array.
        for (var j = simplified.length - 1; j >= 0; j--) {
            b = simplified[j];
            if (b.key === a.key && 
               (b.op.value === '=' ||
               (b.op.value == a.op.value && b.val.value == a.val.value)
            )) {
                continue filters;
            }
            else if (a.op.value === '=' &&
                    a.key === b.key) {
                simplified.splice(j, 1);
            }
        }
        simplified.push(a);
    }
    this.filters = simplified;
};

tree.Selector.prototype.includesFiltersOf = function(other) {
    // Check that this is a strict subset of other.
    var a, b;
    outer: for (var i = 0; i < this.filters.length; i++) {
        a = this.filters[i];
        for (var j = 0; j < other.filters.length; j++) {
            b = other.filters[j];
            if (a.key === b.key &&
                a.op.value == b.op.value &&
                a.val.value == b.val.value) {
                continue outer;
            }
        }
        // Couldn't find the filter in other.
        return false;
    }
    return true;
};

tree.Selector.prototype.includesZoomOf = function(other) {
    if ((!this.zoom && other.zoom) || (this.zoom && !other.zoom)) return false;
    if (this.zoom && other.zoom && !this.zoom.includes(other.zoom)) return false;
    return true;
};

tree.Selector.prototype.negate = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.elements = this.elements.slice();
    obj.attachment = this.attachment;
    obj.index = this.index;

    obj.filters = this.filters.map(function(filter) {
        return filter.negate();
    });
    if (this.zoom) {
        obj.zoom = this.zoom.negate();
    }
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

tree.Selector.prototype.combinedFilter = function(env) {
    var conditions = [];

    if (this.zoom) {
        conditions = this.zoom.toXML()
    }

    var filters = this.filters.map(function(filter) {
        return '(' + filter.toXML(env).trim() + ')';
    });
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
