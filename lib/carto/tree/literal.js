// A literal is a literal string for Mapnik - the
// result of the combination of a `tree.Field` with any
// other type.
(function(tree) {

tree.Literal = function Field(content) {
    this.value = content || '';
    this.is = 'field';
};

tree.Literal.prototype = {
    toString: function() {
        return this.value;
    },
    'ev': function() {
        return this;
    }
};

})(require('../tree'));
