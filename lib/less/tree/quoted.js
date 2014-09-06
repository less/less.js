var Node = require("./node.js"),
    JsEvalNode = require("./js-eval-node.js"),
    Variable = require("./variable.js");

var Quoted = function (str, content, escaped, index, currentFileInfo) {
    this.escaped = escaped;
    this.value = content || '';
    this.quote = str.charAt(0);
    this.index = index;
    this.currentFileInfo = currentFileInfo;
};
Quoted.prototype = new JsEvalNode();
Quoted.prototype.type = "Quoted";
Quoted.prototype.genCSS = function (env, output) {
    if (!this.escaped) {
        output.add(this.quote, this.currentFileInfo, this.index);
    }
    output.add(this.value);
    if (!this.escaped) {
        output.add(this.quote);
    }
};
Quoted.prototype.eval = function (env) {
    var that = this;
    var value = this.value.replace(/`([^`]+)`/g, function (_, exp) {
        return String(that.evaluateJavaScript(exp, env));
    }).replace(/@\{([\w-]+)\}/g, function (_, name) {
        var v = new(Variable)('@' + name, that.index, that.currentFileInfo).eval(env, true);
        return (v instanceof Quoted) ? v.value : v.toCSS();
    });
    return new(Quoted)(this.quote + value + this.quote, value, this.escaped, this.index, this.currentFileInfo);
};
Quoted.prototype.compare = function (other) {
    // when comparing quoted strings allow the quote to differ
    if (other.type === "Quoted" && !this.escaped && !other.escaped) {
        return Node.numericCompare(this.value, other.value);
    } else {
        return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    }
};
module.exports = Quoted;
