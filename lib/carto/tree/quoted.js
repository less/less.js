(function(tree) {

tree.Quoted = function Quoted(str, content) {
    this.value = content || '';
    this.quote = str.charAt(0);
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
        if (other.is !== 'string') {
            return new tree.Quoted(this.quote,
                this.toString() + op + other.toString());
        } else {
            return new tree.Quoted(this.quote,
                tree.operate(op, this.toString(), other.toString()));
        }
    }
};

})(require('../tree'));
