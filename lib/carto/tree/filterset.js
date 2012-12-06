var tree = require('../tree');

tree.Filterset = function Filterset() {};

Object.defineProperty(tree.Filterset.prototype, 'toXML', {
    enumerable: false,
    value: function(env) {
        var filters = [];
        for (var id in this) {
            filters.push('(' + this[id].toXML(env).trim() + ')');
        }

        if (filters.length) {
            return '    <Filter>' + filters.join(' and ') + '</Filter>\n';
        } else {
            return '';
        }
    }
});

Object.defineProperty(tree.Filterset.prototype, 'toString', {
    enumerable: false,
    value: function() {
        var arr = [];
        for (var id in this) arr.push(this[id].id);
        arr.sort();
        return arr.join('\t');
    }
});

Object.defineProperty(tree.Filterset.prototype, 'clone', {
    enumerable: false,
    value: function() {
        var clone = new tree.Filterset();
        for (var id in this) {
            clone[id] = this[id];
        }
        return clone;
    }
});

// Note: other has to be a tree.Filterset.
Object.defineProperty(tree.Filterset.prototype, 'cloneWith', {
    enumerable: false,
    value: function(other) {
        var additions;
        for (var id in other) {
            var status = this.addable(other[id]);
            if (status === false) {
                return false;
            }
            if (status === true) {
                // Adding the filter will override another value.
                if (!additions) additions = [];
                additions.push(other[id]);
            }
        }

        // Adding the other filters doesn't make this filterset invalid, but it
        // doesn't add anything to it either.
        if (!additions) return null;

        // We can successfully add all filters. Now clone the filterset and add the
        // new rules.
        var clone = new tree.Filterset();

        // We can add the rules that are already present without going through the
        // add function as a Filterset is always in it's simplest canonical form.
        for (var id in this) {
            clone[id] = this[id];
        }

        // Only add new filters that actually change the filter.
        while (id = additions.shift()) {
            clone.add(id);
        }

        return clone;
    }
});

/**
 * Returns true when the new filter can be added, false otherwise.
 */
Object.defineProperty(tree.Filterset.prototype, 'addable', {
    enumerable: false,
    value: function(filter) {
        var key = filter.key, value = filter.val;

        switch (filter.op) {
            case '=':
                if (key + '=' in this) return (this[key + '='].val != value) ? false : null;
                if (key + '!=' + value in this) return false;
                if (key + '>' in this  && this[key + '>'].val >= value) return false;
                if (key + '<' in this  && this[key + '<'].val <= value) return false;
                if (key + '>=' in this && this[key + '>='].val > value) return false;
                if (key + '<=' in this && this[key + '<='].val < value) return false;
                return true;

            case '=~':
                return true;

            case '!=':
                if (key + '=' in this) return (this[key + '='].val == value) ? false : null;
                if (key + '!=' + value in this) return null;
                if (key + '>' in this  && this[key + '>'].val >= value) return null;
                if (key + '<' in this  && this[key + '<'].val <= value) return null;
                if (key + '>=' in this && this[key + '>='].val > value) return null;
                if (key + '<=' in this && this[key + '<='].val < value) return null;
                return true;

            case '>':
                if (key + '=' in this) return (this[key + '='].val <= value) ? false : null;
                if (key + '<' in this && this[key + '<'].val <= value) return false;
                if (key + '<=' in this && this[key + '<='].val <= value) return false;
                if (key + '>' in this && this[key + '>'].val >= value) return null;
                if (key + '>=' in this && this[key + '>='].val > value) return null;
                return true;

            case '>=':
                if (key + '=' in this) return (this[key + '='].val < value) ? false : null;
                if (key + '<' in this && this[key + '<'].val <= value) return false;
                if (key + '<=' in this && this[key + '<='].val < value) return false;
                if (key + '>' in this && this[key + '>'].val >= value) return null;
                if (key + '>=' in this && this[key + '>='].val >= value) return null;
                return true;

            case '<':
                if (key + '=' in this) return (this[key + '='].val >= value) ? false : null;
                if (key + '>' in this && this[key + '>'].val >= value) return false;
                if (key + '>=' in this && this[key + '>='].val >= value) return false;
                if (key + '<' in this && this[key + '<'].val <= value) return null;
                if (key + '<=' in this && this[key + '<='].val < value) return null;
                return true;

            case '<=':
                if (key + '=' in this) return (this[key + '='].val > value) ? false : null;
                if (key + '>' in this && this[key + '>'].val >= value) return false;
                if (key + '>=' in this && this[key + '>='].val > value) return false;
                if (key + '<' in this && this[key + '<'].val <= value) return null;
                if (key + '<=' in this && this[key + '<='].val <= value) return null;
                return true;
        }
    }
});

/**
 * Only call this function for filters that have been cleared by .addable().
 */
Object.defineProperty(tree.Filterset.prototype, 'add', {
    enumerable: false,
    value: function(filter) {
        var key = filter.key;

        switch (filter.op) {
            case '=':
                for (var id in this) {
                    if (this[id].key == key) {
                        delete this[id];
                    }
                }
                this[key + '='] = filter;
                break;

            case '!=':
                this[key + '!=' + filter.val] = filter;
                break;

            case '=~':
                this[key + '=~' + filter.val] = filter;
                break;

            case '>':
                // If there are other filters that are also >
                // but are less than this one, they don't matter, so
                // remove them.
                for (var id in this) {
                    if (this[id].key == key && this[id].val <= filter.val) {
                        delete this[id];
                    }
                }
                this[key + '>'] = filter;
                break;

            case '>=':
                for (var id in this) {
                    if (this[id].key == key && this[id].val < filter.val) {
                        delete this[id];
                    }
                }
                if (key + '!=' + filter.val in this) {
                    delete this[key + '!=' + filter.val];
                    filter.op = '>';
                    this[key + '>'] = filter;
                }
                else {
                    this[key + '>='] = filter;
                }
                break;

            case '<':
                for (var id in this) {
                    if (this[id].key == key && this[id].val >= filter.val) {
                        delete this[id];
                    }
                }
                this[key + '<'] = filter;
                break;

            case '<=':
                for (var id in this) {
                    if (this[id].key == key && this[id].val > filter.val) {
                        delete this[id];
                    }
                }
                if (key + '!=' + filter.val in this) {
                    delete this[key + '!=' + filter.val];
                    filter.op = '<';
                    this[key + '<'] = filter;
                }
                else {
                    this[key + '<='] = filter;
                }
                break;
        }
    }
});
