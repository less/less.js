var Node = require("./node.js"),
    Variable = require("./variable.js");

var JsEvalNode = function() {
};
JsEvalNode.prototype = new Node();

JsEvalNode.prototype.evaluateJavaScript = function (expression, env) {
    var result,
        that = this,
        context = {};

    if (env.javascriptEnabled !== undefined && !env.javascriptEnabled) {
        throw { message: "You are using JavaScript, which has been disabled.",
            filename: this.currentFileInfo.filename,
            index: this.index };
    }

    expression = expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
        return that.jsify(new(Variable)('@' + name, that.index, that.currentFileInfo).eval(env));
    });

    try {
        expression = new(Function)('return (' + expression + ')');
    } catch (e) {
        throw { message: "JavaScript evaluation error: " + e.message + " from `" + expression + "`" ,
            filename: this.currentFileInfo.filename,
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
            filename: this.currentFileInfo.filename,
            index: this.index };
    }
    return result;
};
JsEvalNode.prototype.jsify = function (obj) {
    if (Array.isArray(obj.value) && (obj.value.length > 1)) {
        return '[' + obj.value.map(function (v) { return v.toCSS(); }).join(', ') + ']';
    } else {
        return obj.toCSS();
    }
};

module.exports = JsEvalNode;
