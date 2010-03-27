if (typeof(require) !== 'undefined') { var tree = require('less/tree') }

tree.Variable = function Variable(name) { this.name = name };
tree.Variable.prototype = {
    toCSS: function (env) { return this.eval(env).toCSS(env) },
    eval: function (env) {
        var variable, name = this.name;

        if (variable = tree.find(env.frames, function (frame) {
            return tree.find(frame.variables(), function (variable) {
                if (variable.name === name) {
                    return variable.value.eval ? variable.value.eval(env)
                                               : variable.value;
                }
            });
        })) { return variable }
        else {
            throw new(Error)("variable " + this.name + " is undefined");
        }
    }
};

