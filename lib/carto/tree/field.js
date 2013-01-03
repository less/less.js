(function(tree) {

tree.Field = function Field(content) {
    this.value = content || '';
};

tree.Field.prototype = {
    is: 'field',
    toString: function() {
        return '[' + this.value + ']';
    },
    'ev': function() {
        return this;
    }
};

})(require('../tree'));
