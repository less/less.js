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
    },
    operate: function(op, other) {
        return new tree.Quoted(false,
            this.toString() + op + other.toString(true));
    }
};

})(require('../tree'));
