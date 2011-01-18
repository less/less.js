(function(tree) {
tree.Rule = function(name, value, important, index) {
    this.name = name;
    this.value = (value instanceof tree.Value) ?
        value : new(tree.Value)([value]);
    this.important = important ? ' ' + important.trim() : '';
    this.index = index;
    this.symbolizer = tree.Reference.symbolizer(this.name);

    if (name.charAt(0) === '@') {
        this.variable = true;
    } else { this.variable = false }
};

tree.Rule.prototype.toCSS = function(env) {
    if (!tree.Reference.validSelector(this.name)) {
        throw {
            message: 'Unrecognized selector: ' + this.name,
            index: this.index
        };
    }

    if (!tree.Reference.validValue(env, this.name, this.value)) {
        throw {
            message: 'Invalid value for ' +
                this.name +
                ', a ' +
                tree.Reference.selector(this.name).type +
                ' is expected',
            index: this.index
        };
    }

    if (this.variable) { return '' }
    else {
        return tree.Reference.selectorName(this.name) +
            '="' +
            this.value.toCSS(env, this.name) +
            '"';
    }
};

tree.Rule.prototype.eval = function(context) {
    return new(tree.Rule)(this.name,
        this.value.eval(context),
        this.important,
        this.index);
};

tree.Shorthand = function(a, b) {
    this.a = a;
    this.b = b;
};

tree.Shorthand.prototype = {
    toCSS: function(env) {
        return this.a.toCSS(env) + '/' + this.b.toCSS(env);
    },
    eval: function() { return this }
};

})(require('mess/tree'));
