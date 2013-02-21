(function (tree) {

tree.Rule = function (name, value, important, index, inline) {
    this.name = name;
    this.value = (value instanceof tree.Value) ? value : new(tree.Value)([value]);
    this.important = important ? ' ' + important.trim() : '';
    this.index = index;
    this.inline = inline || false;

    if (name.charAt(0) === '@') {
        this.variable = true;
    } else { this.variable = false }
};

tree.Rule.prototype = {
    type: "Rule",
    accept: function (visitor) {
        this.value = visitor.visit(this.value);
    },
    toCSS: function (env) {
        if (this.variable) { return "" }
        else {
            return this.name + (env.compress ? ':' : ': ') +
                   this.value.toCSS(env) +
                   this.important + (this.inline ? "" : ";");
        }
    },
    eval: function (env) {
        var strictMathsBypass = false;
        if (this.name === "font" && env.strictMaths === false) {
            strictMathsBypass = true;
            env.strictMaths = true;
        }
        try {
            return new(tree.Rule)(this.name,
                              this.value.eval(env),
                              this.important,
                              this.index, this.inline);
        }
        finally {
            if (strictMathsBypass) {
                env.strictMaths = false;
            }
        }
    },
    makeImportant: function () {
        return new(tree.Rule)(this.name,
                              this.value,
                              "!important",
                              this.index, this.inline);
    }
};

})(require('../tree'));
