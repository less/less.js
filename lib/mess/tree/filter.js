(function(tree) {

tree.Filter = function Filter(key, op, val, index) {
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;
};

tree.Filter.prototype.toXML = function(env) {
    if (this.val.is) {
        var value = this.val.toString((this.val.is == 'string'));
    } else {
        var value = this.val;
    }

    return '[' + this.key + '] ' +
        this.op.toString() +
        ' ' +
        value;
};

tree.Filter.prototype.toString = function() {
    return '[' + this.key + ' ' + this.op.value + ' ' + this.val + ']';
};

/**
 * Negate this filter: warning - this changes
 * the filter itself.
 */
tree.Filter.prototype.negate = function() {
    return new tree.Filter(this.key, this.op.negate(), this.val, this.index);
};

tree.Filter.prototype.conflictsWith = function(filter) {
    if (this.key !== filter.key) return;

    if (this.val.toString() !== filter.val.toString() &&
        this.op.value === '=' &&
        filter.op.value === '=') {
        return true;
    }

    if (this.val.toString() === filter.val.toString() &&
        ((this.op.value === '!=' && filter.op.value === '=') ||
         (this.op.value === '=' && filter.op.value === '!='))) {
        return true;
    }

    // Doesn't yet check for > and <.
};

/**
 * Removes all filters from the list that are overridden by this one.
 * In case another filter is present that overrides this one, the filter won't
 * be added to the list of filters.
 */
tree.Filter.prototype.overrides = function(filter) {
    if (this.key !== filter.key) return;
    if (this.op.value === '=') return true;
};

tree.Filter.prototype.equals = function(other) {
    return this.key === other.key &&
           this.op.value == other.op.value &&
           this.val.toString() == other.val.toString();
};

tree.Filter.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.key = this.key;
    obj.op = this.op.clone();
    obj.val = this.val.clone ? this.val.clone() : this.val;
    obj.index = this.index;
    return obj;
};

tree.Filter.sound = function(filters) {
    for (var i = 0; i < filters.length; i++) {
        for (var j = i + 1; j < filters.length; j++) {
            if (filters[i].conflictsWith(filters[j])) {
                return false;
            }
        }
    }
    return true;
};

})(require('mess/tree'));
