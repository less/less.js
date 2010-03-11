if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Variable = function Variable(name) { this.name = name };
tree.Variable.prototype = {
    toCSS: function (env) { return this.eval(env).toCSS(env) },
    eval: function (env) {
        var variable, name = this.name;

        if (variable = env.frames.find(function (frame) {
            return frame.variables().find(function (variable) {
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

