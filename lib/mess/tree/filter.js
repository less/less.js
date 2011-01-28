(function(tree) {

tree.Filter = function Filter(key, op, val, index) {
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;
    this.id = this.key + this.op + this.val;
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
    return '[' + this.id + ']';
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

tree.Filter.prototype.clone = function() {
    var obj = Object.create(Object.getPrototypeOf(this));
    obj.key = this.key;
    obj.op = this.op.clone();
    obj.val = this.val.clone ? this.val.clone() : this.val;
    obj.index = this.index;
    return obj;
};

tree.Filter.sound = function(filters) {
    // Shortcut for single-filter filters.
    if (Object.keys(filters).length == 1) return true;

    var byKey = {};
    var filter, key, value;

    for (var id in filters) {
        filter = filters[id];
        key = filters[id].key;
        value = filters[id].val.toString();

        if (!(key in byKey)) {
            byKey[key] = {};
        }

        switch (filter.op.value) {
            case '=':
                if ('='  in byKey[key] && byKey[key]['='] != value) return false;
                if ('!=' in byKey[key] && byKey[key]['!='].indexOf(value) >= 0) return false;
                if ('>'  in byKey[key] && byKey[key]['>'] <= value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] >= value) return false;
                if ('>=' in byKey[key] && byKey[key]['>='] < value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] > value) return false;
                byKey[key]['='] = value;
                break;

            case '!=':
                if ('='  in byKey[key] && byKey[key]['='] == value) return false;
                if (!('!=' in byKey[key])) byKey[key]['!='] = [];
                byKey[key]['!='].push(value);
                break;

            case '>':
                if ('='  in byKey[key] && byKey[key]['='] <= value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] <= value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] <= value) return false;
                byKey[key]['>'] = value;
                break;

            case '<':
                if ('='  in byKey[key] && byKey[key]['='] >= value) return false;
                if ('>'  in byKey[key] && byKey[key]['<'] >= value) return false;
                if ('>=' in byKey[key] && byKey[key]['<='] >= value) return false;
                byKey[key]['<'] = value;
                break;

            case '>=':
                if ('='  in byKey[key] && byKey[key]['='] < value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] < value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] < value) return false;
                byKey[key]['>='] = value;
                break;

            case '<=':
                if ('='  in byKey[key] && byKey[key]['='] > value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] > value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] > value) return false;
                byKey[key]['<='] = value;
                break;
        }
    }
    delete byKey;
    return true;
};

tree.Filter.simplify = function(filters) {
    // Shortcut for single-filter filters.
    if (Object.keys(filters).length == 1) return true;

    var byKey = {};
    var filter, key, value;

    for (var id in filters) {
        filter = filters[id];
        key = filters[id].key;
        value = filters[id].val.toString();

        switch (filter.op.value) {
            case '=':
                if (byKey[key]) {
                    for (var i in byKey[key]) {
                        delete filters[i];
                    }
                }
                byKey[key] = '=';
                break;


            case '!=':
                if (byKey[key] == '=') {
                    delete filters[id];
                } else {
                    if (!byKey[key]) byKey[key] = {};
                    byKey[key][id] = true;
                }
                break;

            // TODO: >, <, >=, <=
        }
    }
    delete byKey;
};

})(require('mess/tree'));
