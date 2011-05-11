(function(tree) {

//
// A function call node.
//
tree.Call = function Call(name, args) {
    this.name = name;
    this.args = args;
};
tree.Call.prototype = {
    //
    // When evaluating a function call,
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
    eval: function(env) {
        var args = this.args.map(function(a) { return a.eval(env); });

        for (var i = 0; i < args.length; i++) {
            if (args[i].is === 'undefined') {
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
        }

        if (this.name in tree.functions) { // 1.
            return tree.functions[this.name].apply(tree.functions, args);
        } else { // 2.
            return new tree.Anonymous(this.name +
                   '(' + args.map(function(a) { return a.toString(); }).join(', ') + ')');
        }
    },

    toString: function(env) {
        return this.eval(env).toString();
    }
};

})(require('carto/tree'));
