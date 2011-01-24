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

tree.Rule.prototype.toXML = function(env) {
    if (!tree.Reference.validSelector(this.name)) {
        return env.error({
            message: "Unrecognized selector: " + this.name,
            index: this.index
        });
    }

    if ((this.value instanceof tree.Value) &&
        !tree.Reference.validValue(env, this.name, this.value)) {
        return env.error({
            message: 'Invalid value for ' +
                this.name +
                ', a ' +
                tree.Reference.selector(this.name).type +
                ' is expected. ' + this.value + 
                ' was given.',
            index: this.index
        });
    }

    if (this.variable) {
        return '';
    } else if (tree.Reference.isFont(this.name) && this.value.value.length > 1) {
        var f = tree._getFontSet(env, this.value.value);
        return 'fontset_name="' + f.name + '"';
    } else {
        return tree.Reference.selectorName(this.name) +
            '="' +
            this.value.toString(env, this.name) +
            '"';
    }
};

/**
 * TODO: Rule eval chain should add fontsets to env.frames
 */
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
