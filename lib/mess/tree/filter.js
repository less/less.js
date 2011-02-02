(function(tree) {

tree.Filter = function Filter(key, op, val, index) {
    this.key = key instanceof tree.Quoted ? key.value : key;
    this.op = op;
    this.val = val instanceof tree.Quoted ? val.value : val;
    if (op !== '=' && op !== '!=') {
        this.val = 1*this.val;
        if (isNaN(this.val)) {
            throw {
                message: 'Cannot use operator "' + op + '" with value ' + val,
                index: index
            };
        }
    }
    this.id = this.key + this.op + this.val;
};


// XML-safe versions of comparators
var opXML = {
    '<': '&lt;',
    '>': '&gt;',
    '=': '=',
    '!=': '!=',
    '<=': '&lt;=',
    '>=': '&gt;='
};

// inverses of comparators
var opNegate = {
    '<': '>=',
    '<=': '>',
    '>': '<=',
    '>=': '<',
    '=': '!=',
    '!=': '='
};


tree.Filter.prototype.toXML = function(env) {
    if (this.key.indexOf("'") >= 0)
        var key = "'" + this.key.replace(/'/g, "\\'") + "'";
    if (this.val.replace)
        var val = "'" + this.val.replace(/'/g, "\\'") + "'";

    return '[' + (key || this.key) + '] ' + opXML[this.op] + ' ' + (val || this.val);
};

tree.Filter.prototype.toString = function() {
    return '[' + this.id + ']';
};

// Negate this filter: warning - this changes
// the filter itself.
tree.Filter.prototype.negate = function() {
    return new tree.Filter(this.key, opNegate[this.op], this.val);
};

tree.Filter.prototype.clone = function() {
    var obj = Object.create(tree.Filter.prototype);
    obj.key = this.key;
    obj.op = this.op;
    obj.val = this.val.clone ? this.val.clone() : this.val;
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
                value = filters[id].val;
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
                value = filters[id].val;
                if ('=' in byKey[key] && byKey[key]['='] == value) return false;
                if (!('!=' in byKey[key])) byKey[key]['!='] = [];
                byKey[key]['!='].push(value);
                break;

            case '>':
                number = parseInt(filters[id].val, 10);
                if ('=' in byKey[key] && byKey[key]['='] <= number) return false;
                if ('<' in byKey[key] && byKey[key]['<'] <= number) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] <= number) return false;
                byKey[key]['>'] = number;
                break;

            case '>=':
                number = parseInt(filters[id].val, 10);
                if ('=' in byKey[key] && byKey[key]['='] < number) return false;
                if ('<' in byKey[key] && byKey[key]['<'] <= number) return false;
                if ('<=' in byKey[key] && byKey[key]['<='] < number) return false;
                byKey[key]['>='] = number;
                break;

            case '<':
                number = parseInt(filters[id].val, 10);
                if ('=' in byKey[key] && byKey[key]['='] >= number) return false;
                if ('>' in byKey[key] && byKey[key]['>'] >= number) return false;
                if ('>=' in byKey[key] && byKey[key]['>='] >= number) return false;
                byKey[key]['<'] = number;
                break;

            case '<=':
                number = parseInt(filters[id].val, 10);
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
    if (Object.keys(filters).length == 1) return filters;

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
                value = parseInt(filters[id].val, 10);
                n = key + '>=';
                if (n in byKey) {
                    if (filters[byKey[n]].val > value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '>';
                if (n in byKey) {
                    if (filters[byKey[n]].val >= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;

            case '>=':
                value = parseInt(filters[id].val, 10);
                n = key + '>';
                if (n in byKey) {
                    if (filters[byKey[n]].val >= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '>=';
                if (n in byKey) {
                    if (filters[byKey[n]].val > value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;

            case '<':
                value = parseInt(filters[id].val, 10);
                n = key + '<=';
                if (n in byKey) {
                    if (filters[byKey[n]].val < value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '<';
                if (n in byKey) {
                    if (filters[byKey[n]].val <= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;

            case '<=':
                value = parseInt(filters[id].val, 10);
                n = key + '<';
                if (n in byKey) {
                    if (filters[byKey[n]].val <= value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                    delete byKey[n];
                }

                n = key + '<=';
                if (n in byKey) {
                    if (filters[byKey[n]].val < value) { delete filters[id]; continue; }
                    else delete filters[byKey[n]];
                }
                byKey[n] = id;
                break;
        }
    }

    delete byKey;
    return filters;
};

// Test two rules to decide whether one can be merged into the other.
// returns the rule that the other rule can be merged into.
tree.Filter.mergable = function(f1, f2) {
    var filters1 = Object.keys(f1);
    var filters2 = Object.keys(f2);

    // Remove identical keys from both arrays.
    for (var i = filters1.length - 1; i >= 0; i--) {
        var index = filters2.indexOf(filters1[i]);
        if (index >= 0) {
            filters1.splice(i, 1);
            filters2.splice(index, 1);
        }
    }

    if (filters1.length === 0) {
        // f1 is a superset of f2.
        return f1;
    }
    else if (filters2.length === 0) {
        // f2 is a superset of f1.
        return f2;
    }
    else if (filters1.length === 1 || filters2.length === 1) {
        var reverse = filters2.length === 1;
        var single = reverse ? f2[filters2.shift()] : f1[filters1.shift()];
        var keys = reverse ? filters1 : filters2;
        var filters = reverse ? f2 : f1;
        var others = reverse ? f1 : f2;

        // Make sure we're only dealing with the same filter keys here.
        for (var i = 0; i < keys.length; i++) {
            if (others[keys[i]].key !== single.key) return;
        }
        for (var i = 0; i < keys.length; i++) {
            var op = others[keys[i]].op;
            if ((single.val == others[keys[i]].val) &&
               ((single.op === '>=' && op === '<') || (single.op === '<' && op === '>=') ||
                (single.op === '<=' && op === '>') || (single.op === '>' && op === '<='))) {
                    delete filters[single.id];
                    return filters;
            }
        }
    }
};

})(require('mess/tree'));
