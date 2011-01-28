(function(tree) {

tree.Filter = function Filter(key, op, val, index) {
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;
    this.id = this.key + this.op.value + this.val;
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

tree.Filter.prototype.clone = function() {
    var obj = Object.create(tree.Filter.prototype);
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
                if ('='  in byKey[key] && byKey[key]['='] >= value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] >= value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] >= value) return false;
                byKey[key]['>'] = value;
                break;

            case '<':
                if ('='  in byKey[key] && byKey[key]['='] <= value) return false;
                if ('>'  in byKey[key] && byKey[key]['<'] <= value) return false;
                if ('>=' in byKey[key] && byKey[key]['<='] <= value) return false;
                byKey[key]['<'] = value;
                break;

            case '>=':
                if ('='  in byKey[key] && byKey[key]['='] > value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] > value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] > value) return false;
                byKey[key]['>='] = value;
                break;

            case '<=':
                if ('='  in byKey[key] && byKey[key]['='] < value) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] < value) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] < value) return false;
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

tree.Filter.mergable = function(f1, f2) {
    var filters1 = Object.keys(f1);
    var filters2 = Object.keys(f2);

    var possibleSuperset = filters1.length != filters2.length;

    for (var i = filters1.length - 1; i >= 0; i--) {
        var index = filters2.indexOf(filters1[i]);
        if (index >= 0) {
            filters1.splice(i, 1);
            filters2.splice(index, 1);
        }
    }

    if (filters1.length == 0) {
        // f1 is a superset of f2.
        return f1;
    }
    else if (filters2.length == 0) {
        // f2 is a superset of f1.
        return f2;
    }
    else if (filters1.length == filters2.length == 1) {
        // One can't be the superset of another becaues they have the same
        // number of filters. We already excluded the filters being identical
        // through the filter ID.
        var key1 = filters1.shift(), key2 = filters2.shift();
        var filter1 = f1[key1], filter2 = f2[key2];
        // Only merge for the same key.
        if (filter1.key !== filter2.key) return;

        // Simple case:
        if (filter1.val.toString() == filter2.val.toString()) {
            var op1 = filter1.op.value, op2 = filter2.op.value;
            if ((op1 === '>=' && op2 === '<') || (op1 === '<' && op2 === '>=') ||
                (op1 === '<=' && op2 === '>') || (op1 === '>' && op2 === '<=')) {
                delete f1[key1];
                return f1;
            }
        }

        // TODO: Find more complex mergeable filters.
    }
};

})(require('mess/tree'));
