(function(tree) {

tree.Field = function Field(content) {
    this.value = content || '';
    this.is = 'field';
};

tree.Field.prototype = {
    toString: function() {
        return '[' + this.value + ']';
    },
    'eval': function() {
        return this;
    }
};

})(require('../tree'));
