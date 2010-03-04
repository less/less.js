if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.URL = function URL(val) {
    this.value = val;
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + (this.value.toCSS ? this.value.toCSS() : this.value) + ")";
    }
};
