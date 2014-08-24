var JsEvalNode = require("./js-eval-node.js"),
    Dimension = require("./dimension.js"),
    Quoted = require("./quoted.js"),
    Anonymous = require("./anonymous.js");

var JavaScript = function (string, index, escaped) {
    this.escaped = escaped;
    this.expression = string;
    this.index = index;
};
JavaScript.prototype = new JsEvalNode();
JavaScript.prototype.type = "JavaScript";
JavaScript.prototype.eval = function(env) {
    var result = this.evaluateJavaScript(this.expression, env);

    if (typeof(result) === 'number') {
        return new(Dimension)(result);
    } else if (typeof(result) === 'string') {
        return new(Quoted)('"' + result + '"', result, this.escaped, this.index);
    } else if (Array.isArray(result)) {
        return new(Anonymous)(result.join(', '));
    } else {
        return new(Anonymous)(result);
    }
};

module.exports = JavaScript;
