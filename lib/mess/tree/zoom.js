(function(tree) {

tree.Zoom = function Zoom(op, value, index) {
    value = parseInt(value);
    if (value > tree.Zoom.maxZoom || value < 0) {
        throw {
            message: 'Only zoom levels between 0 and ' + tree.Zoom.maxZoom + ' supported.',
            index: index
        };
    }
    this.range = tree.Zoom.rangeFromCondition(op.value, value);
    this.specificity = 1;
};

tree.Zoom.newFromRange = function(range) {
    var obj = Object.create(tree.Zoom.prototype);
    obj.range = [];
    for (var i = 0; i < tree.Zoom.maxZoom; i++) {
        obj.range[i] = i >= range[0] && i <= range[1];
    }
    return obj;
}

tree.Zoom.maxZoom = 22;

tree.Zoom.ranges = {
     0: 1000000000,
     1: 500000000,
     2: 200000000,
     3: 100000000,
     4: 50000000,
     5: 25000000,
     6: 12500000,
     7: 6500000,
     8: 3000000,
     9: 1500000,
    10: 750000,
    11: 400000,
    12: 200000,
    13: 100000,
    14: 50000,
    15: 25000,
    16: 12500,
    17: 5000,
    18: 2500,
    19: 1000,
    20: 500,
    21: 250,
    22: 100,
    23: 50
};

/**
 * Create an array of true, false values
 * which denotes whether this filter should apply
 * to each of the zoom levels from 0-22.
 */
tree.Zoom.rangeFromCondition = function(op, value) {
    var range = [];
    if (op === '=') {
        for (var i = 0; i < tree.Zoom.maxZoom; i++) {
            range[i] = (i == value);
        }
    } else if (op === '>' || op === '>=') {
        if (op === '>') value++;
        for (var i = 0; i < tree.Zoom.maxZoom; i++) {
            range[i] = (i >= value);
        }
    } else {
        if (op === '<') value--;
        for (var i = 0; i < tree.Zoom.maxZoom; i++) {
            range[i] = (i <= value);
        }
    }
    return range;
};

/**
 * Returns an array of ranges that are set.
 */
tree.Zoom.prototype.getRanges = function() {
    var ranges = [], start = null;
    for (var i = 0; i < this.range.length; i++) {
        if (start == null && this.range[i]) {
            start = i;
        } else if (start != null && !this.range[i]) {
            ranges.push([start, i - 1]);
            start = null;
        }
    }
    if (start != null) ranges.push([start, 22]);
    return ranges;
}

/**
 * Find the overlap of this and another set
 */
tree.Zoom.prototype.intersection = function(filter) {
    if (filter.range) {
        for (var i = 0; i < this.range.length; i++) {
            this.range[i] = this.range[i] && filter.range[i];
        }
        this.specificity += filter.specificity;
    }
    return this;
};

/**
 * Invert this style rule. Apply to all zoom levels
 * that the rule previously did not apply to and
 * vice versa.
 *
 * Usage is for doing the equivalent of an ElseFilter
 * for defaulting to non-zoom-filtered rules
 */
tree.Zoom.prototype.negate = function() {
    var negated = this.clone();
    negated.range = this.range.map(function(i) {
        return !i;
    });
    return negated;
};

tree.Zoom.prototype.toXML = function(env) {
    var ranges = this.getRanges();
    return ranges.map(function(range) {
        return ((range[0] > 0) ?
                '<MaxScaleDenominator>' + tree.Zoom.ranges[range[0]] + '</MaxScaleDenominator>' 
                : '') +
            ((range[1] < 22) ?
                '<MinScaleDenominator>' + tree.Zoom.ranges[range[1] + 1] + '</MinScaleDenominator>'
                : '');
    });
};

tree.Zoom.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.range = this.range.slice();
    obj.specificity = this.specificity;
    return obj;
}

})(require('mess/tree'));
