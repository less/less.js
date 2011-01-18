(function (tree) {

var sys = require('sys');

tree.Invalid = function (chunk, index) {
    this.chunk = chunk;
    this.index = index;
};
tree.Invalid.prototype = {
    toCSS: function (env) {
        return env.error({
            message: "Invalid code: " + sys.inspect(this.chunk),
            index: this.index
        });
    }
};

})(require('mess/tree'));
