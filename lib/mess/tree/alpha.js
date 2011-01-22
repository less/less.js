(function(tree) {

tree.Alpha = function(val) {
    this.value = val;
};
tree.Alpha.prototype = {
    toString: function() {
        return 'alpha(opacity=' +
               (this.value.toString ? this.value.toString() : this.value) + ')';
    },
    eval: function() { return this }
};

})(require('mess/tree'));
