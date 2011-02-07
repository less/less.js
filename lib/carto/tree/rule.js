(function(tree) {
tree.Rule = function Rule(name, value, index, filename) {
    this.name = name;
    this.value = (value instanceof tree.Value) ?
        value : new tree.Value([value]);
    this.index = index;
    this.symbolizer = tree.Reference.symbolizer(this.name);
    this.filename = filename;
    this.variable = (name.charAt(0) === '@');
};

tree.Rule.prototype.clone = function() {
    var clone = Object.create(tree.Rule.prototype);
    clone.name = this.name
    clone.value = this.value;
    clone.index = this.index;
    clone.symbolizer = this.symbolizer;
    clone.filename = this.filename;
    clone.variable = this.variable;
    return clone;
};

tree.Rule.prototype.updateID = function() {
    return this.id = this.zoom + '#' + this.name;
};

tree.Rule.prototype.toString = function() {
    return '[' + tree.Zoom.toString(this.zoom) + '] ' + this.name + ': ' + this.value;
};

tree.Rule.prototype.toXML = function(env) {
    if (!tree.Reference.validSelector(this.name)) {
        return env.error({
            message: "Unrecognized selector: " + this.name,
            index: this.index,
            type: 'syntax',
            filename: this.filename
        });
    }

    if ((this.value instanceof tree.Value) &&
        !tree.Reference.validValue(env, this.name, this.value)) {
        return env.error({
            message: 'Invalid value for ' +
                this.name +
                ', a valid ' +
                (tree.Reference.selector(this.name).validate ||
                    tree.Reference.selector(this.name).type) +
                ' is expected. ' + this.value + 
                ' was given.',
            index: this.index,
            type: 'syntax',
            filename: this.filename
        });
    }

    if (this.variable) {
        return '';
    } else if (tree.Reference.isFont(this.name) && this.value.value.length > 1) {
        var f = tree._getFontSet(env, this.value.value);
        return 'fontset-name="' + f.name + '"';
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
        this.index,
        this.filename);
};

tree.Shorthand = function Shorthand(a, b) {
    this.a = a;
    this.b = b;
};

tree.Shorthand.prototype = {
    toString: function(env) {
        return this.a.toString(env) + '/' + this.b.toString(env);
    },
    eval: function() { return this }
};

})(require('carto/tree'));
