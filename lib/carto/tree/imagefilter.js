(function(tree) {
//
// RGB Colors - #ff0014, #eee
//
tree.ImageFilter = function ImageFilter(type, args) {
    this.is = 'imagefilter';
};
tree.ImageFilter.prototype = {
    eval: function() { return this; },

    toString: function() {
        
    }
};


})(require('../tree'));
