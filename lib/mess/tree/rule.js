(function(tree) {
tree.Rule = function(name, value, important, index) {
    this.name = name;
    this.value = (value instanceof tree.Value) ?
        value : new tree.Value([value]);
    this.important = important ? ' ' + important.trim() : '';
    this.index = index;
    this.symbolizer = tree.Reference.symbolizer(this.name);

    if (name.charAt(0) === '@') {
        this.variable = true;
    } else { this.variable = false }
};

tree.Rule.prototype.toString = function(env) {
    if (!tree.Reference.validSelector(this.name)) {
        return env.error({
            message: "Unrecognized selector: " + this.name,
            index: this.index
        });
    }

    // TODO: this is a big thing that I don't understand:
    // some values are getting through as bare 'values',
    // not instances of tree.Value, and that's breaking things.
    // This needs work.
    if ((this.value instanceof tree.Value) &&
        !tree.Reference.validValue(env, this.name, this.value)) {
        return env.error({
            message: 'Invalid value for ' +
                this.name +
                ', a ' +
                tree.Reference.selector(this.name).type +
                ' is expected. ' + require('sys').inspect(this.value) + 
                ' was given.',
            index: this.index
        });
    }

    if (!this.value) {
        console.log(this);
    }

    if (this.variable) { return '' }
    else {
        return tree.Reference.selectorName(this.name) +
            '="' +
            this.value.toString(env, this.name) +
            '"';
    }
};

tree.Rule.prototype.eval = function(context) {
    return new tree.Rule(this.name,
        this.value.eval(context),
        this.important,
        this.index);
};

tree.Shorthand = function(a, b) {
    this.a = a;
    this.b = b;
};

tree.Shorthand.prototype = {
    toString: function(env) {
        return this.a.toString(env) + '/' + this.b.toString(env);
    },
    eval: function() { return this }
};

})(require('mess/tree'));
