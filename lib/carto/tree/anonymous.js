(function(tree) {

tree.Anonymous = function Anonymous(string) {
    this.value = string.value || string;
};
tree.Anonymous.prototype = {
    toString: function() {
        return this.value;
    },
    eval: function() { return this; }
};

})(require('carto/tree'));
