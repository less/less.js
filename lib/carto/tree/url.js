(function(tree) {

tree.URL = function URL(val, paths) {
    this.value = val;
    this.paths = paths;
    this.is = 'uri';
};
tree.URL.prototype = {
    toString: function() {
        return this.value.toString();
    },
    eval: function(ctx) {
        return new tree.URL(this.value.eval(ctx), this.paths);
    }
};

})(require('../tree'));
