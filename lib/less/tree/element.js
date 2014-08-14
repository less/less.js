module.exports = function (tree) {

var Element = function (combinator, value, index, currentFileInfo) {
    this.combinator = combinator instanceof tree.Combinator ?
                      combinator : new(tree.Combinator)(combinator);

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
Element.prototype = {
    type: "Element",
    accept: function (visitor) {
        var value = this.value;
        this.combinator = visitor.visit(this.combinator);
        if (typeof value === "object") {
            this.value = visitor.visit(value);
        }
    },
    eval: function (env) {
        return new(Element)(this.combinator,
                                 this.value.eval ? this.value.eval(env) : this.value,
                                 this.index,
                                 this.currentFileInfo);
    },
    genCSS: function (env, output) {
        output.add(this.toCSS(env), this.currentFileInfo, this.index);
    },
    toCSS: function (env) {
        var value = (this.value.toCSS ? this.value.toCSS(env) : this.value);
        if (value === '' && this.combinator.value.charAt(0) === '&') {
            return '';
        } else {
            return this.combinator.toCSS(env || {}) + value;
        }
    }
};
return Element;
