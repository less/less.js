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

})(require('mess/tree'));
