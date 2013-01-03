(function(tree) {

tree.Comment = function Comment(value, silent) {
    this.value = value;
    this.silent = !!silent;
};

tree.Comment.prototype = {
    toString: function(env) {
        return '<!--' + this.value + '-->';
    },
    'ev': function() { return this; }
};

})(require('../tree'));
