if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Call = function Call(name, args) {
    this.name = name;
    this.args = args;
};
tree.Call.prototype = {
    eval: function (env) { return this },
    toCSS: function (context, env) {
        var args = this.args.map(function (a) { return a.eval() });
        if (this.name in tree.functions) {
            return tree.functions[this.name].apply(tree.functions, args).toCSS();
        } else {
            return this.name +
                   "(" + args.map(function (a) { return a.toCSS() }).join(', ') + ")";
        }
    }
};
