(function(tree) {

tree.Quoted = function(str, content) {
    this.value = content || '';
    this.quote = str.charAt(0);
    this.is = 'string';
};
tree.Quoted.prototype = {
    toString: function(quotes) {
        return (quotes === true) ? "'" + this.value + "'" : this.value;
    },
    eval: function() {
        return this;
    }
};

})(require('mess/tree'));
