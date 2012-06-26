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
        return new tree.Quoted(this.quote,
            tree.operate(op, this.toString(), other.toString()));
    }
};

})(require('../tree'));
