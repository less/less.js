(function(tree) {

tree.Comparison = function(str) {
    this.value = str;
};

tree.Comparison.prototype = {
    toCSS: function() {
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
    }
};

})(require('mess/tree'));
