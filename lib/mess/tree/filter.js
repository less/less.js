(function(tree) {

tree.Filter = function(key, op, val, index) {
    this.max_zoom = 22; // maximum number of zoom levels
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;

    if (this.key === 'zoom') {
        var val = parseInt(this.val, 10);
        this.zoom_range = [];

        if (this.op.value === '>' || this.op.value === '>=') {
            if (this.op.value === '>') val++;
            for (var i = 0; i < this.max_zoom; i++) {
                this.zoom_range[i] = (i <= val);
            }
        } else {
            // TODO: non-correct ops will fail here
            if (this.op.value === '<') val--;
            for (var i = 0; i < this.max_zoom; i++) {
                this.zoom_range[i] = (i >= val);
            }
        }
    }

    this.zooms = {
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
     '22': [50, 100]
   };
};

tree.Filter.prototype.union = function(filter) {
    if (filter.zoom_range) {
        for (var i = 0; i < this.max_zoom; i++) {
            this.zoom_range[i] = this.zoom_range[i] && filter.zoom_range[i];
        }
    }
}

tree.Filter.prototype.inverse = function() {
    for (var i = 0; i < this.max_zoom; i++) {
        this.zoom_range[i] = !this.zoom_range[i];
    }
}

tree.Filter.prototype.toCSS = function(env) {
    if (this.key === 'zoom') {
        if (parseInt(this.val) > 22 || parseInt(this.val) < 0) {
            throw {
                message: 'Only zoom levels between 0 and 22 supported.',
                index: this.index
            }
        }
        if (this.op.toCSS() == '&gt;') {
            return '<MaxScaleDenominator>' + this.zooms[this.val][0] +
                '</MaxScaleDenominator>';
        }
        if (this.op.toCSS() == '&gt; =') {
            return '<MaxScaleDenominator>' + this.zooms[this.val][1] +
                '</MaxScaleDenominator>';
        }
        if (this.op.toCSS() == '&lt;') {
            return '<MinScaleDenominator>' + this.zooms[this.val][1] +
                '</MinScaleDenominator>';
        }
        if (this.op.toCSS() == '&lt; =') {
            return '<MinScaleDenominator>' + this.zooms[this.val][0] +
                '</MinScaleDenominator>';
        }
    } else {
        if (this.val.is) {
            this.val = this.val.toCSS((this.val.is == 'string'));
        }
        return '<Filter>[' + this.key + '] ' +
            this.op.toCSS() +
            ' ' +
            this.val +
            '</Filter>';
    }
};

})(require('mess/tree'));
