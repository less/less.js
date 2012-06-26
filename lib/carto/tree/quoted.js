(function(tree) {

tree.Quoted = function Quoted(ever_quote, content) {
    this.value = content || '';
    // ever_quote is basicaly a shutoff switch for this quoted string
    // being a real expression. you can pass `false` as the first parameter
    // to make sure that this never gets double-quoted. This is used with fields.
    this.ever_quote = ever_quote;
    this.is = 'string';
};

tree.Quoted.prototype = {
    toString: function(quotes) {
        var xmlvalue = this.value.replace(/\'/g, '&apos;');
        return (this.ever_quote && quotes === true) ? "'" + xmlvalue + "'" : this.value;
    },

    'eval': function() {
        return this;
    },

    operate: function(op, other) {
        if (other.is !== 'string') {
            return new tree.Quoted(false,
                this.toString(true) + op + other.toString());
        } else {
            return new tree.Quoted(true,
                tree.operate(op, this.toString(), other.toString()));
        }
    }
};

})(require('../tree'));
