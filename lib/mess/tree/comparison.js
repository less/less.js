(function(tree) {

tree.Comparison = function Comparison(str) {
    this.value = str;
};

var mapping = {
    '<': '&lt;',
    '>': '&gt;',
    '=': '=',
    '!=': '!=',
    '<=': '&lt;=',
    '>=': '&gt;='
};

var inverse = {
    '<': '>=',
    '<=': '>',
    '>': '<=',
    '>=': '<',
    '=': '!=',
    '!=': '='
};

tree.Comparison.prototype = {
    toString: function() {
        return mapping[this.value];
    },
    negate: function() {
        return new tree.Comparison(inverse[this.value]);
    },
    eval: function() {
        return this;
    }
};
})(require('mess/tree'));
