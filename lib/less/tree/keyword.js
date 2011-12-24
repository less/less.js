(function (tree) {

tree.Keyword = function (value) { this.value = value };
tree.Keyword.prototype = {
    eval: function () { return this },
    toCSS: function () { return this.value },
    compare: function (other) {
        if (other instanceof tree.Keyword) {
            return other.value === this.value ? 0 : 1;
        }
    }
};

})(require('../tree'));
