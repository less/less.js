var Node = require("./node"),
    Paren = require("./paren"),
    Combinator = require("./combinator");

var Element = function (combinator, value, index, currentFileInfo) {
    this.combinator = combinator instanceof Combinator ?
                      combinator : new(Combinator)(combinator);

    if (typeof(value) === 'string') {
        this.value = value.trim();
    } else if (value) {
        this.value = value;
    } else {
        this.value = "";
    }
    this.index = index;
    this.currentFileInfo = currentFileInfo;
};
Element.prototype = new Node();
Element.prototype.type = "Element";
Element.prototype.accept = function (visitor) {
    var value = this.value;
    this.combinator = visitor.visit(this.combinator);
    if (typeof value === "object") {
        this.value = visitor.visit(value);
    }
};
Element.prototype.eval = function (env) {
    return new(Element)(this.combinator,
                             this.value.eval ? this.value.eval(env) : this.value,
                             this.index,
                             this.currentFileInfo);
};
Element.prototype.genCSS = function (env, output) {
    output.add(this.toCSS(env), this.currentFileInfo, this.index);
};
Element.prototype.toCSS = function (env) {
    env = env || {};
    var value = this.value, firstSelector = env.firstSelector;
    if (value instanceof Paren) {
        // selector in parens should not be affected by outer selector
        // flags (breaks only interpolated selectors - see #1973)
        env.firstSelector = true;
    }
    value = value.toCSS ? value.toCSS(env) : value;
    env.firstSelector = firstSelector;
    if (value === '' && this.combinator.value.charAt(0) === '&') {
        return '';
    } else {
        return this.combinator.toCSS(env) + value;
    }
};
module.exports = Element;
