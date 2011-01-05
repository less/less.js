(function (tree) {

tree.Comparison = function (str) {
    this.value = str;
};
tree.Comparison.prototype = {
    toCSS: function () {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '=': '=',
            '<=': '&lt; =',
            '>=': '&gt; ='}[this.value];
    },
    eval: function () {
        return this;
    }
};

})(require('mess/tree'));
