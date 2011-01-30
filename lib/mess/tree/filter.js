(function(tree) {

tree.Filter = function Filter(key, op, val, index) {
    this.key = key;
    this.op = op;
    this.val = val;
    this.index = index;
    this.id = key + op + val;
};


var opXML = {
    '<': '&lt;',
    '>': '&gt;',
    '=': '=',
    '!=': '!=',
    '<=': '&lt;=',
    '>=': '&gt;='
};

var opNegate = {
    '<': '>=',
    '<=': '>',
    '>': '<=',
    '>=': '<',
    '=': '!=',
    '!=': '='
};


tree.Filter.prototype.toXML = function(env) {
    if (this.val.is) {
        var value = this.val.toString((this.val.is == 'string'));
    } else {
        var value = this.val;
    }

    return '[' + this.key + '] ' + opXML[this.op] + ' ' + value;
};

tree.Filter.prototype.toString = function() {
    return '[' + this.id + ']';
};

/**
 * Negate this filter: warning - this changes
 * the filter itself.
 */
tree.Filter.prototype.negate = function() {
    return new tree.Filter(this.key, opNegate[this.op], this.val, this.index);
};

tree.Filter.prototype.clone = function() {
    var obj = Object.create(tree.Filter.prototype);
    obj.key = this.key;
    obj.op = this.op;
    obj.val = this.val.clone ? this.val.clone() : this.val;
    obj.index = this.index;
    return obj;
};

tree.Filter.sound = function(filters) {
    // Shortcut for single-filter filters.
    if (Object.keys(filters).length == 1) return true;

    var byKey = {};
    var filter, key, value, number;

    for (var id in filters) {
        filter = filters[id];
        key = filters[id].key;

        if (!(key in byKey)) {
            byKey[key] = {};
        }

        switch (filter.op) {
            case '=':
                value = filters[id].val.toString();
                if ('='  in byKey[key] && byKey[key]['='] != value) return false;
                if ('!=' in byKey[key] && byKey[key]['!='].indexOf(value) >= 0) return false;
                number = parseInt(value, 10);
                if ('>'  in byKey[key] && byKey[key]['>'] >= number) return false;
                if ('<'  in byKey[key] && byKey[key]['<'] <= number) return false;
                if ('>=' in byKey[key] && byKey[key]['>='] > number) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] < number) return false;
                byKey[key]['='] = value;
                break;

            case '!=':
                value = filters[id].val.toString();
                if ('=' in byKey[key] && byKey[key]['='] == value) return false;
                if (!('!=' in byKey[key])) byKey[key]['!='] = [];
                byKey[key]['!='].push(value);
                break;

            case '>':
                number = parseInt(filters[id].val.toString(), 10);
                if ('=' in byKey[key] && byKey[key]['='] <= number) return false;
                if ('<' in byKey[key] && byKey[key]['<'] <= number) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] <= number) return false;
                byKey[key]['>'] = number;
                break;

            case '>=':
                number = parseInt(filters[id].val.toString(), 10);
                if ('=' in byKey[key] && byKey[key]['='] < number) return false;
                if ('<' in byKey[key] && byKey[key]['<'] <= number) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] < number) return false;
                byKey[key]['>='] = number;
                break;

            case '<':
                number = parseInt(filters[id].val.toString(), 10);
                if ('=' in byKey[key] && byKey[key]['='] >= number) return false;
                if ('>' in byKey[key] && byKey[key]['>'] >= number) return false;
                if ('>=' in byKey[key] && byKey[key]['>='] >= number) return false;
                byKey[key]['<'] = number;
                break;

            case '<=':
                number = parseInt(filters[id].val.toString(), 10);
                if ('=' in byKey[key] && byKey[key]['='] > number) return false;
                if ('>' in byKey[key] && byKey[key]['>'] >= number) return false;
                if ('>=' in byKey[key] && byKey[key]['>='] > number) return false;
                byKey[key]['<='] = number;
                break;
        }
    }

    delete byKey;
    return true;
};

// Only simplifies sound filters.
tree.Filter.simplify = function(filters) {
    // Shortcut for single-filter filters.
    if (Object.keys(filters).length == 1) filters;

    var byKey = {};
    var filter, key, value;

    for (var id in filters) {
        filter = filters[id];
        key = filters[id].key;

        if (byKey[key] === true) {
            delete filters[id];
        } else switch (filter.op) {
            case '=':
                if ((key + '!=') in byKey) {
                    n = key + '!=';
                    while (other = byKey[n].pop()) delete filters[other];
                }
                if ((key + '>') in byKey) delete filters[byKey[key + '>']];
                if ((key + '>=') in byKey) delete filters[byKey[key + '>=']];
                if ((key + '<') in byKey) delete filters[byKey[key + '<']];
                if ((key + '<=') in byKey) delete filters[byKey[key + '<=']];
                byKey[key] = true;
                break;

            case '!=':
                n = key + '!=';
                if (n in byKey) byKey[n].push(id);
                else byKey[n] = [id];
                break;

            case '>':
                value = parseInt(filters[id].val.toString(), 10);
                n = key + '>=';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() > value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '>';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() >= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;

            case '>=':
                value = parseInt(filters[id].val.toString(), 10);
                n = key + '>';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() >= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '>=';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() > value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;


            case '<':
                value = parseInt(filters[id].val.toString(), 10);
                n = key + '<=';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() < value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '<';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() <= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;

            case '<=':
                value = parseInt(filters[id].val.toString(), 10);
                n = key + '<';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() <= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '<=';
                if (n in byKey) {
                    if (filters[byKey[n]].val.toString() < value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;
        }
    }

    delete byKey;
    return filters;
};

tree.Filter.mergable = function(f1, f2) {
    var filters1 = Object.keys(f1);
    var filters2 = Object.keys(f2);

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
            var op1 = filter1.op, op2 = filter2.op;
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
