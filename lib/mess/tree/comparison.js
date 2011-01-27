(function(tree) {

tree.Comparison = function Comparison(str) {
    this.value = str;
};

tree.Comparison.prototype = {
    toString: function() {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '=': '=',
            '!=': '!=',
            '<=': '&lt;=',
            '>=': '&gt;='}[this.value];
    },
    negate: function() {
        return new tree.Comparison({
            '<': '>=',
            '<=': '>',
            '>': '<=',
            '>=': '<',
            '=': '!=',
            '!=': '='
        }[this.value]);
    },
    eval: function() {
        return this;
    },
    clone: function() {
        var obj = Object.create(Object.getPrototypeOf(this));
        obj.value = this.value;
        return obj;
    },
    toString: function() {
        return this.value;
    }
};

})(require('mess/tree'));
