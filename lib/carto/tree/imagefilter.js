(function(tree) {
//
// RGB Colors - #ff0014, #eee
//
tree.ImageFilter = function ImageFilter(filter, args) {
    this.is = 'imagefilter';
    this.filter = filter;
    this.args = args || null;
};
tree.ImageFilter.prototype = {
    eval: function() { return this; },

    toString: function() {
        if (this.args) {
            // TODO
        } else {
            return this.filter;
        }
    }
};


})(require('../tree'));
