(function (tree) {

tree.Quoted = function (str, content) {
    this.value = content || '';
    this.quote = str.charAt(0);
};
tree.Quoted.prototype = {
    toCSS: function () {
        return this.quote + this.value + this.quote;
    },
    eval: function () {
        return this;
    }
};

})(require('less/tree'));
