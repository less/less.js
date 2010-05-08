if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.URL = function URL(val) {
    this.value = val;
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS() + ")";
    },
    eval: function () { return this }
};
