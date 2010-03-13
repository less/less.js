if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Alpha = function Alpha(val) {
    this.value = val;
};
tree.Alpha.prototype = {
    toCSS: function () {
        return "alpha(opacity=" + (this.value.toCSS ? this.value.toCSS() : this.value) + ")";
    }
};
