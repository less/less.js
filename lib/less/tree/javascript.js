(function (tree) {

tree.JavaScript = function (string, index, escaped) {
    this.escaped = escaped;
    this.expression = string;
    this.index = index;
};
tree.JavaScript.prototype = {
    toCSS: function () {
        if (this.escaped) {
            return this.evaluated;
        } else {
            return JSON.stringify(this.evaluated);
        }
    },
    eval: function (env) {
        var result,
            context = {};

        var expression = this.expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
            return new(tree.Variable)('@' + name).eval(env).value;
        });

        expression = new(Function)('return (' + expression + ')');

        for (var k in env.frames[0].variables()) {
            context[k.slice(1)] = {
                value: env.frames[0].variables()[k].value,
                toJS: function () {
                    return this.value.eval(env).toCSS();
                }
            };
        }

        try {
            this.evaluated = expression.call(context);
        } catch (e) {
            throw { message: "JavaScript evaluation error: '" + e.name + ': ' + e.message + "'" ,
                    index: this.index };
        }
        return this;
    }
};

})(require('less/tree'));

