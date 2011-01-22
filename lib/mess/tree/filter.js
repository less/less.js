(function(tree) {

tree.Filter = function(key, op, val, index) {
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;
};

tree.Filter.prototype.toXML = function(env) {
    if (this.val.is) {
        this.val = this.val.toString((this.val.is == 'string'));
    }
    return '[' + this.key + '] ' +
        this.op.toString() +
        ' ' +
        this.val;
};

/**
 * Negate this filter: warning - this changes
 * the filter itself.
 *
 * TODO: should this have an index?
 */
tree.Filter.prototype.negate = function() {
    return new tree.Filter(this.key, this.op.negate(), this.val);
};

})(require('mess/tree'));
