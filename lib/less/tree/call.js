if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

//
// A function call node.
//
tree.Call = function Call(name, args) {
    this.name = name;
    this.args = args;
};
tree.Call.prototype = {
    eval: function (env) { return this },

    //
    // When generating CSS from a function call,
    // we either find the function in `tree.functions` [1],
    // in which case we call it, passing the  evaluated arguments,
    // or we simply print it out as it appeared originally [2].
    //
    // The *functions.js* file contains the built-in functions.
    //
    // The reason why we evaluate the arguments, is in the case where
    // we try to pass a variable to a function, like: `saturate(@color)`.
    // The function should receive the value, not the variable.
    //
    toCSS: function (context, env) {
        var args = this.args.map(function (a) { return a.eval() });

        if (this.name in tree.functions) { // 1.
            return tree.functions[this.name].apply(tree.functions, args).toCSS();
        } else { // 2.
            return this.name +
                   "(" + args.map(function (a) { return a.toCSS() }).join(', ') + ")";
        }
    }
};
