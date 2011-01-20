(function(tree) {

tree.ZoomFilter = function(key, op, val, index) {
    this.key = key;
    this.op = op;
    this.val = parseInt(val);
    this.index = index;
    this.zoom_range = this.create_range(this.op.value, this.val);
};

/**
 * Create an array of true, false values
 * which denotes whether this filter should apply
 * to each of the zoom levels from 0-22.
 */
tree.ZoomFilter.prototype.create_range = function(op, value) {
    var max_zoom = 22;
    var zoom_range = [];
    if (op === '>' || op === '>=') {
        if (op === '>') val++;
        for (var i = 0; i < max_zoom; i++) {
            zoom_range[i] = (i >= val);
        }
    } else {
        if (op === '<') val--;
        for (var i = 0; i < max_zoom; i++) {
            zoom_range[i] = (i <= val);
        }
    }
    return zoom_range;
};

/**
 * Find the overlap of this and another set
 */
tree.ZoomFilter.prototype.intersection = function(filter) {
    if (filter.zoom_range) {
        for (var i = 0; i < this.max_zoom; i++) {
            this.zoom_range[i] = this.zoom_range[i] && filter.zoom_range[i];
        }
    }
};

/**
 * Find the union of this and another set
 */
tree.ZoomFilter.prototype.union = function(filter) {
    if (filter.zoom_range) {
        for (var i = 0; i < this.max_zoom; i++) {
            this.zoom_range[i] = this.zoom_range[i] || filter.zoom_range[i];
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
    this.zoom_range = this.zoom_range.map(function(i) {
        return !i;
    });
    return this;
};

tree.ZoomFilter.prototype.toXML = function(env) {
    if (this.val > 22 || this.val < 0) {
        throw {
            message: 'Only zoom levels between 0 and 22 supported.',
            index: this.index
        };
    }

    var zooms = {
      '1': [200000000, 500000000],
      '2': [100000000, 200000000],
      '3': [50000000, 100000000],
      '4': [25000000, 50000000],
      '5': [12500000, 25000000],
      '6': [6500000, 12500000],
      '7': [3000000, 6500000],
      '8': [1500000, 3000000],
      '9': [750000, 1500000],
     '10': [400000, 750000],
     '11': [200000, 400000],
     '12': [100000, 200000],
     '13': [50000, 100000],
     '14': [25000, 50000],
     '15': [12500, 25000],
     '16': [5000, 12500],
     '17': [2500, 5000],
     '18': [1000, 2500],
     '19': [500, 1000],
     '20': [250, 500],
     '21': [100, 250],
     '22': [50, 100]};

    switch (this.op.value) {
        case '&gt;':
            return '<MaxScaleDenominator>' + zooms[this.val][0] +
                '</MaxScaleDenominator>';
        case '&gt;=':
            return '<MaxScaleDenominator>' + zooms[this.val][1] +
                '</MaxScaleDenominator>';
        case '&lt;':
            return '<MinScaleDenominator>' + zooms[this.val][1] +
                '</MinScaleDenominator>';
        case '&lt;=':
            return '<MinScaleDenominator>' + zooms[this.val][0] +
                '</MinScaleDenominator>';
    }
};
})(require('mess/tree'));
