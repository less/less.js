(function(tree) {

tree.Filter = function Filter(key, op, val, index) {
    if (key.is) {
        this.key = key.value;
        this._key = key;
    } else {
        this.key = key;
    }

    this.op = op;

    if (val.is) {
        this.val = val.value;
        this._val = val;
    } else {
        this.val = val;
    }

    if (op !== '=' && op !== '!=') {
        this.val = 1 * this.val;
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

tree.Filter.prototype.toXML = function(env) {
    if (this.val.eval) this._val = this.val.eval(env);
    if (this.key.eval) this._key = this.key.eval(env);
    if (this._key) var key = this._key.toString(false);
    if (this._val) var val = this._val.toString(this._val.is == 'string');

    return '[' + (key || this.key) + '] ' + opXML[this.op] + ' ' + (val || this.val);
};

tree.Filter.prototype.toString = function() {
    return '[' + this.id + ']';
};

})(require('carto/tree'));
