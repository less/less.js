if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Call = function Call(name, args) {
    this.name = name;
    this.args = args;
};
tree.Call.prototype = {
    toCSS: function (context, env) {
        return tree.functions[this.name].apply(tree.functions, this.args).toCSS();
    }
};
