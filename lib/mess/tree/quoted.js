(function (tree) {

tree.Quoted = function (str, content) {
    this.value = content || '';
    this.quote = str.charAt(0);
    this.is = 'string';
};
tree.Quoted.prototype = {
    toCSS: function () {
        return this.value;
    },
    eval: function () {
        return this;
    }
};

})(require('mess/tree'));
