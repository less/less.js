(function(tree) {
var _ = require('underscore');

tree.Call = function Call(name, args, index) {
    this.is = 'call';

    this.name = name;
    this.args = args;
    this.index = index;
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
    'eval': function(env) {
        var args = this.args.map(function(a) { return a.eval(env); });

        for (var i = 0; i < args.length; i++) {
            if (args[i].is === 'undefined') {
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
        }

        if (this.name in tree.functions) {
            if (tree.functions[this.name].length === args.length) {
                return tree.functions[this.name].apply(tree.functions, args);
            } else {
                env.error({
                    message: 'incorrect number of arguments for ' + this.name +
                        '(). ' + tree.functions[this.name].length + ' expected.',
                    index: this.index,
                    type: 'runtime',
                    filename: this.filename
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
        } else {
            var fn = tree.Reference.mapnikFunction(this.name);
            if (!fn) {
                var functions = tree.Reference.mapnikFunctions();
                // cheap closest, needs improvement.
                var name = this.name;
                var mean = functions.map(function(f) {
                    return [f[0], tree.Reference.editDistance(name, f[0]), f[1]];
                }).sort(function(a, b) {
                    return a[1] - b[1];
                });
                env.error({
                    message: 'unknown function ' + this.name + '(), did you mean ' +
                        mean[0][0] + '(' + mean[0][2] + ')',
                    index: this.index,
                    type: 'runtime',
                    filename: this.filename
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
            if (fn[1] !== args.length) {
                env.error({
                    message: 'function ' + this.name + '() takes ' +
                        fn[1] + ' arguments and was given ' + args.length,
                    index: this.index,
                    type: 'runtime',
                    filename: this.filename
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            } else {
                // Save the evaluated versions of arguments
                this.args = args;
                return this;
            }
        }
    },

    toString: function(env, format) {
        if (this.args.length) {
            return this.name + '(' + this.args.join(',') + ')';
        } else {
            return this.name;
        }
    }
};

})(require('../tree'));
