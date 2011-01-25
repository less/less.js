(function(tree) {

tree.ZoomFilter = function ZoomFilter(op, value, index) {
    value = parseInt(value);
    if (value > tree.ZoomFilter.maxZoom || value < 0) {
        throw {
            message: 'Only zoom levels between 0 and ' + tree.ZoomFilter.maxZoom + ' supported.',
            index: index
        };
    }
    this.range = tree.ZoomFilter.rangeFromCondition(op.value, value);
};

tree.ZoomFilter.newFromRange = function(range) {
    var obj = Object.create(tree.ZoomFilter.prototype);
    obj.range = [];
    for (var i = 0; i < tree.ZoomFilter.maxZoom; i++) {
        obj.range[i] = i >= range[0] && i <= range[1];
    }
    return obj;
}

tree.ZoomFilter.maxZoom = 22;

tree.ZoomFilter.ranges = {
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
tree.ZoomFilter.rangeFromCondition = function(op, value) {
    var range = [];
    if (op === '=') {
        for (var i = 0; i < tree.ZoomFilter.maxZoom; i++) {
            range[i] = (i == value);
        }
    } else if (op === '>' || op === '>=') {
        if (op === '>') value++;
        for (var i = 0; i < tree.ZoomFilter.maxZoom; i++) {
            range[i] = (i >= value);
        }
    } else {
        if (op === '<') value--;
        for (var i = 0; i < tree.ZoomFilter.maxZoom; i++) {
            range[i] = (i <= value);
        }
    }
    return range;
};

/**
 * Returns an array of ranges that are set.
 */
tree.ZoomFilter.prototype.getRanges = function() {
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
tree.ZoomFilter.prototype.intersection = function(filter) {
    if (filter.range) {
        for (var i = 0; i < this.range.length; i++) {
            this.range[i] = this.range[i] && filter.range[i];
        }
    }
};

/**
 * Invert this style rule. Apply to all zoom levels
 * that the rule previously did not apply to and
 * vice versa.
 *
 * Usage is for doing the equivalent of an ElseFilter
 * for defaulting to non-zoom-filtered rules
 */
tree.ZoomFilter.prototype.negate = function() {
    var negated = this.clone();
    negated.range = this.range.map(function(i) {
        return !i;
    });
    return negated;
};

tree.ZoomFilter.prototype.toXML = function(env) {
    var ranges = this.getRanges();
    return ranges.map(function(range) {
        return ((range[0] > 0) ?
                '<MaxScaleDenominator>' + tree.ZoomFilter.ranges[range[0]] + '</MaxScaleDenominator>' 
                : '') +
            ((range[1] < 22) ?
                '<MinScaleDenominator>' + tree.ZoomFilter.ranges[range[1] + 1] + '</MinScaleDenominator>'
                : '');
    });
};

tree.ZoomFilter.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.range = this.range.slice();
    return obj;
}

})(require('mess/tree'));
