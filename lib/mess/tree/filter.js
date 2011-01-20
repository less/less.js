(function(tree) {

tree.Filter = function(key, op, val, index) {
    this.max_zoom = 22; // maximum number of zoom levels
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;
};

tree.Filter.prototype.toCSS = function(env) {
    if (this.val.is) {
        this.val = this.val.toCSS((this.val.is == 'string'));
    }
    return '<Filter>[' + this.key + '] ' +
        this.op.toCSS() +
        ' ' +
        this.val +
        '</Filter>';
};

/**
 * Negate this filter: warning - this changes
 * the filter itself.
 */
tree.Filter.prototype.negate = function() {
    this.op = this.op.negate();
    return this;
};

})(require('mess/tree'));
