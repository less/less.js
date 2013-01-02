(function(tree) {

tree.URL = function URL(val, paths) {
    this.value = val;
    this.paths = paths;
};

tree.URL.prototype = {
    is: 'uri',
    toString: function() {
        return this.value.toString();
    },
    eval: function(ctx) {
        return new tree.URL(this.value.eval(ctx), this.paths);
    }
};

})(require('../tree'));
