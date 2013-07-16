(function (tree) {

tree.Rule = function (name, value, important, merge, index, currentFileInfo, inline) {
    this.name = name;
    this.value = (value instanceof tree.Value) ? value : new(tree.Value)([value]);
    this.important = important ? ' ' + important.trim() : '';
    this.merge = merge;
    this.index = index;
    this.currentFileInfo = currentFileInfo;
    this.inline = inline || false;
    this.variable = (name.charAt(0) === '@');
};

tree.Rule.prototype = {
    type: "Rule",
    accept: function (visitor) {
        this.value = visitor.visit(this.value);
    },
    genCSS: function (env, output) {
        output.add(this.toCSS(env));
    },
    toCSS: function (env) {
        if (this.variable) { return ""; }
        else {
            try {
                var css = this.name + (env.compress ? ':' : ': ') +
                   this.value.toCSS(env) +
                   this.important + ((this.inline || (env.lastRule && env.compress)) ? "" : ";");
                return css;
            }
            catch(e) {
                e.index = this.index;
                e.filename = this.currentFileInfo.filename;
                throw e;
            }
        }
    },
    eval: function (env) {
        var strictMathBypass = false;
        if (this.name === "font" && env.strictMath === false) {
            strictMathBypass = true;
            env.strictMath = true;
        }
        try {
            return new(tree.Rule)(this.name,
                              this.value.eval(env),
                              this.important,
                              this.merge,
                              this.index, this.currentFileInfo, this.inline);
        }
        finally {
            if (strictMathBypass) {
                env.strictMath = false;
            }
        }
    },
    makeImportant: function () {
        return new(tree.Rule)(this.name,
                              this.value,
                              "!important",
                              this.merge,
                              this.index, this.currentFileInfo, this.inline);
    }
};

})(require('../tree'));
