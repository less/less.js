if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Call = function Call(name, args) {
    this.name = name;
    this.args = args;
};
tree.Call.prototype = {
    toCSS: function (context, env) {
        var args = this.args.map(function (a) { return a.eval() });
        return tree.functions[this.name].apply(tree.functions, args).toCSS();
    }
};
