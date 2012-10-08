(function(tree) {

tree.Quoted = function Quoted(content) {
    this.value = content || '';
    this.is = 'string';
};

tree.Quoted.prototype = {
    toString: function(quotes) {
        var xmlvalue = this.value.replace(/\'/g, '&apos;');
        return (quotes === true) ? "'" + xmlvalue + "'" : this.value;
    },

    'eval': function() {
        return this;
    },

    operate: function(op, other) {
        return new tree.Quoted(tree.operate(op, this.toString(), other.toString(this.contains_field)));
    }
};

})(require('../tree'));
