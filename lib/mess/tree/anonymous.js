(function(tree) {

tree.Anonymous = function(string) {
    this.value = string.value || string;
};
tree.Anonymous.prototype = {
    toString: function() {
        return this.value;
    },
    eval: function() { return this }
};

})(require('mess/tree'));
