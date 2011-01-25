(function(tree) {

tree.JavaScript = function JavaScript(string, index) {
    this.expression = string;
    this.index = index;
};
tree.JavaScript.prototype = {
    toString: function() {
        return JSON.stringify(this.evaluated);
    },
    eval: function(env) {
        var result,
            expression = new Function('return (' + this.expression + ')'),
            context = {};

        for (var k in env.frames[0].variables()) {
            context[k.slice(1)] = {
                value: env.frames[0].variables()[k].value,
                toJS: function() {
                    return this.value.eval(env).toString();
                }
            };
        }

        try {
            this.evaluated = expression.call(context);
        } catch (e) {
            throw {
                message: "JavaScript evaluation error: '" + e.name + ': ' + e.message + "'" ,
                index: this.index
            };
        }
        return this;
    }
};

})(require('mess/tree'));

