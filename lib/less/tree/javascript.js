(function (tree) {

tree.JavaScript = function (string, index, escaped) {
    this.escaped = escaped;
    this.expression = string;
    this.index = index;
};
tree.JavaScript.prototype = {
    type: "JavaScript",
    eval: function (env) {
        var result,
            that = this,
            context = {};

        var expression = this.expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
            return tree.jsify(new(tree.Variable)('@' + name, that.index).eval(env));
        });

        try {
            expression = new(Function)('return (' + expression + ')');
        } catch (e) {
            throw { message: "JavaScript evaluation error: " + e.message + " from `" + expression + "`" ,
                    index: this.index };
        }

        var variables = env.frames[0].variables();
        for (var k in variables) {
            if (variables.hasOwnProperty(k)) {
                /*jshint loopfunc:true */
                context[k.slice(1)] = {
                    value: variables[k].value,
                    toJS: function () {
                        return this.value.eval(env).toCSS();
                    }
                };
            }
        }

        try {
            result = expression.call(context);
        } catch (e) {
            throw { message: "JavaScript evaluation error: '" + e.name + ': ' + e.message.replace(/["]/g, "'") + "'" ,
                    index: this.index };
        }
        return (function outputType (value, firstLevel) {
            var type = typeof (value);
            if (type === 'number') {
                return new(tree.Dimension)(value);
            } else if (type === 'string') {
                return new(tree.Quoted)('"' + value + '"', value, that.escaped, that.index);
            } else if (Array.isArray(value)) {
                if (firstLevel) {
                	console.log("firstLevel", value);
                    return new(tree.Value)(value.map(outputType));
                }
                else {
                	console.log("not firstLevel", value);
                    return new(tree.Expression)(value.map(outputType))
                }
            }
            return new(tree.Anonymous)(value);
        }(result, true));
    }
};

})(require('../tree'));

