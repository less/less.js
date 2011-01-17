(function (tree) {

var sys = require('sys');

tree.Invalid = function (chunk, index) {
    this.chunk = chunk;
    this.index = index;
};
tree.Invalid.prototype = {
    toCSS: function (env) {
        throw {
            message: "Invalid code: " + sys.inspect(this.chunk),
            index: this.index
        };
        
        return '';
    },
    eval: function () { return this }
};

})(require('mess/tree'));
