(function(tree) {

tree.Filter = function Filter(key, op, val, index, filename) {
    if (key.is) {
        this.key = key.value;
        this._key = key;
    } else {
        this.key = key;
    }

    this.op = op;
    this.index = index;
    this.filename = filename;

    if (val.is) {
        this.val = val.value;
        this._val = val;
    } else {
        this.val = val;
    }

    if (ops[this.op][1]) {
        this.val = 1 * this.val;
    }

    this.id = this.key + this.op + this.val;
};


// xmlsafe, numeric, suffix
var ops = {
    '<': [' &lt; ', true],
    '>': [' &gt; ', true],
    '=': [' = ', false],
    '!=': [' != ', false],
    '<=': [' &lt;= ', true],
    '>=': [' &gt;= ', true],
    '=~': ['.match(', false, ')']
};

tree.Filter.prototype.toXML = function(env) {
    if (ops[this.op][1] && isNaN(this.val)) {
        env.error({
            message: 'Cannot use operator "' + this.op + '" with value ' + this.val,
            index: this.index,
            filename: this.filename
        });
    }
    if (this.val.eval) this._val = this.val.eval(env);
    if (this.key.eval) this._key = this.key.eval(env);
    if (this._key) var key = this._key.toString(false);
    if (this._val) var val = this._val.toString(this._val.is == 'string');

    return '[' + (key || this.key) + ']' + ops[this.op][0] + '' + (val || this.val) + (ops[this.op][2] || '');
};

tree.Filter.prototype.toString = function() {
    return '[' + this.id + ']';
};

})(require('../tree'));
