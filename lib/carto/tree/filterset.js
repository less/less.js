var tree = require('../tree');

tree.Filterset = function Filterset() {
    this.filters = {};
};

tree.Filterset.prototype.toXML = function(env) {
    var filters = [];
    for (var id in this.filters) {
        filters.push('(' + this.filters[id].toXML(env).trim() + ')');
    }
    if (filters.length) {
        return '    <Filter>' + filters.join(' and ') + '</Filter>\n';
    } else {
        return '';
    }
};

tree.Filterset.prototype.toString = function() {
    var arr = [];
    for (var id in this.filters) arr.push(this.filters[id].id);
    return arr.sort().join('\t');
};

tree.Filterset.prototype.eval = function(env) {
    for (var i in this.filters) {
        this.filters[i].eval(env);
    }
    return this;
};

tree.Filterset.prototype.clone = function() {
    var clone = new tree.Filterset();
    for (var id in this.filters) {
        clone.filters[id] = this.filters[id];
    }
    return clone;
};

// Note: other has to be a tree.Filterset.
tree.Filterset.prototype.cloneWith = function(other) {
    var additions = [];
    for (var id in other.filters) {
        var status = this.addable(other.filters[id]);
        // status is true, false or null. if it's null we don't fail this
        // clone nor do we add the filter.
        if (status === false) {
            return false;
        }
        if (status === true) {
            // Adding the filter will override another value.
            additions.push(other.filters[id]);
        }
    }

    // Adding the other filters doesn't make this filterset invalid, but it
    // doesn't add anything to it either.
    if (!additions.length) {
        return null;
    }

    // We can successfully add all filters. Now clone the filterset and add the
    // new rules.
    var clone = new tree.Filterset();

    // We can add the rules that are already present without going through the
    // add function as a Filterset is always in it's simplest canonical form.
    for (id in this.filters) {
        clone.filters[id] = this.filters[id];
    }

    // Only add new filters that actually change the filter.
    while (id = additions.shift()) {
        clone.add(id);
    }

    return clone;
};

// Returns true when the new filter can be added, false otherwise.
// It can also return null, and on the other side we test for === true or
// false
tree.Filterset.prototype.addable = function(filter) {
    var key = filter.key.toString(),
        value = filter.val.toString();

    if (!isNaN(parseFloat(value))) value = parseFloat(value);

    switch (filter.op) {
        case '=':
            // if there is already foo= and we're adding foo=
            if (key + '=' in this.filters) {
                if (this.filters[key + '='].val.toString() != value) {
                    return false;
                } else {
                    return null;
                }
            }
            if (key + '!=' + value in this.filters) return false;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return false;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return false;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return false;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return false;
            return true;

        case '=~':
            return true;

        case '!=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val == value) ? false : null;
            if (key + '!=' + value in this.filters) return null;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return null;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return null;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return null;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return null;
            return true;

        case '>':
            if (key + '=' in this.filters) {
                if (this.filters[key + '='].val <= value) {
                    return false;
                } else {
                    return null;
                }
            }
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return false;
            if (key + '<=' in this.filters && this.filters[key + '<='].val <= value) return false;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return null;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return null;
            return true;

        case '>=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val < value) ? false : null;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return false;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return false;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return null;
            if (key + '>=' in this.filters && this.filters[key + '>='].val >= value) return null;
            return true;

        case '<':
            if (key + '=' in this.filters) return (this.filters[key + '='].val >= value) ? false : null;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return false;
            if (key + '>=' in this.filters && this.filters[key + '>='].val >= value) return false;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return null;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return null;
            return true;

        case '<=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val > value) ? false : null;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return false;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return false;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return null;
            if (key + '<=' in this.filters && this.filters[key + '<='].val <= value) return null;
            return true;
    }
};

// Only call this function for filters that have been cleared by .addable().
tree.Filterset.prototype.add = function(filter) {
    var key = filter.key.toString(), id, op = filter.op, numval;

    if (op === '=') {
        for (var i in this.filters) {
            if (this.filters[i].key == key) delete this.filters[i];
        }
        this.filters[key + '='] = filter;
    } else if (op === '!=') {
        this.filters[key + '!=' + filter.val] = filter;
    } else if (op === '=~') {
        this.filters[key + '=~' + filter.val] = filter;
    } else if (op === '>') {
        // If there are other filters that are also >
        // but are less than this one, they don't matter, so
        // remove them.
        for (var j in this.filters) {
            if (this.filters[j].key == key && this.filters[j].val <= filter.val) {
                delete this.filters[j];
            }
        }
        this.filters[key + '>'] = filter;
    } else if (op === '>=') {
        for (var k in this.filters) {
            numval = (+this.filters[k].val.toString());
            if (this.filters[k].key == key && numval < filter.val) {
                delete this.filters[k];
            }
        }
        if (key + '!=' + filter.val in this.filters) {
            delete this.filters[key + '!=' + filter.val];
            filter.op = '>';
            this.filters[key + '>'] = filter;
        }
        else {
            this.filters[key + '>='] = filter;
        }
    } else if (op === '<') {
        for (var l in this.filters) {
            numval = (+this.filters[l].val.toString());
            if (this.filters[l].key == key && numval >= filter.val) {
                delete this.filters[l];
            }
        }
        this.filters[key + '<'] = filter;
    } else if (op === '<=') {
        for (var m in this.filters) {
            numval = (+this.filters[m].val.toString());
            if (this.filters[m].key == key && numval > filter.val) {
                delete this.filters[m];
            }
        }
        if (key + '!=' + filter.val in this.filters) {
            delete this.filters[key + '!=' + filter.val];
            filter.op = '<';
            this.filters[key + '<'] = filter;
        }
        else {
            this.filters[key + '<='] = filter;
        }
    }
};
