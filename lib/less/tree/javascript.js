(function (tree) {

tree.JavaScript = function (string, index) {
    this.expression = string;
    this.index = index;
};
tree.JavaScript.prototype = {
    toCSS: function () {
        return this.evaluated;
    },
    eval: function (env) {
        var result,
            expression = new(Function)('return (' + this.expression + ')'),
            context = {};

        for (var k in env.frames[0].variables()) {
            context[k.slice(1)] = env.frames[0].variables()[k].value.eval(env).toCSS();
        }

        try {
            result = expression.call(context);
            this.evaluated = JSON.stringify(result);
        } catch (e) {
            throw { message: "JavaScript evaluation error: '" + e.name + ': ' + e.message + "'" ,
                    index: this.index };
        }
        return this;
    }
};

})(require('less/tree'));

