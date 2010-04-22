if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Anonymous = function Anonymous(string) {
    this.value = string.content;
};
tree.Anonymous.prototype = {
    toCSS: function () {
        return this.value;
    },
    eval: function () { return this }
};
