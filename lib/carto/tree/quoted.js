(function(tree) {

tree.Quoted = function Quoted(content) {
    this.value = content || '';
};

tree.Quoted.prototype = {
    is: 'string',

    toString: function(quotes) {
        var escapedValue = this.value
            .replace(/&/g, '&amp;')
        var xmlvalue = escapedValue
            .replace(/\'/g, '\\\'')
            .replace(/\"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/\>/g, '&gt;');
        return (quotes === true) ? "'" + xmlvalue + "'" : escapedValue;
    },

    'ev': function() {
        return this;
    },

    operate: function(env, op, other) {
        return new tree.Quoted(tree.operate(op, this.toString(), other.toString(this.contains_field)));
    }
};

})(require('../tree'));
