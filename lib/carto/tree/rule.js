(function(tree) {
tree.Rule = function Rule(name, value, index, filename) {
    var parts = name.split('/');
    this.name = parts.pop();
    this.instance = parts.length ? parts[0] : '__default__';
    this.value = (value instanceof tree.Value) ?
        value : new tree.Value([value]);
    this.index = index;
    this.symbolizer = tree.Reference.symbolizer(this.name);
    this.filename = filename;
    this.variable = (name.charAt(0) === '@');

    this.is = 'rule';
};

tree.Rule.prototype.clone = function() {
    var clone = Object.create(tree.Rule.prototype);
    clone.name = this.name;
    clone.value = this.value;
    clone.index = this.index;
    clone.instance = this.instance;
    clone.symbolizer = this.symbolizer;
    clone.filename = this.filename;
    clone.variable = this.variable;
    return clone;
};

tree.Rule.prototype.updateID = function() {
    return this.id = this.zoom + '#' + this.instance + '#' + this.name;
};

tree.Rule.prototype.toString = function() {
    return '[' + tree.Zoom.toString(this.zoom) + '] ' + this.name + ': ' + this.value;
};

// second argument, if true, outputs the value of this
// rule without the usual attribute="content" wrapping. Right
// now this is just for the TextSymbolizer, but applies to other
// properties in reference.json which specify serialization=content
tree.Rule.prototype.toXML = function(env, content, sep, format) {
    if (!tree.Reference.validSelector(this.name)) {
        var name = this.name;
        var mean = tree.Reference.selectors.map(function(f) {
            return [f, tree.Reference.editDistance(name, f)];
        }).sort(function(a, b) {
            return a[1] - b[1];
        });
        var mean_message = '';
        if (mean[0][1] < 3) {
            mean_message = '. Did you mean ' + mean[0][0] + '?';
        }
        return env.error({
            message: "Unrecognized rule: " + this.name + mean_message,
            index: this.index,
            type: 'syntax',
            filename: this.filename
        });
    }

    if ((this.value instanceof tree.Value) &&
        !tree.Reference.validValue(env, this.name, this.value)) {
        if (!tree.Reference.selector(this.name)) {
            return env.error({
                message: 'Unrecognized property: ' +
                    this.name,
                index: this.index,
                type: 'syntax',
                filename: this.filename
            });
        } else {
            var typename;
            if (tree.Reference.selector(this.name).validate) {
                typename = tree.Reference.selector(this.name).validate;
            } else if (typeof tree.Reference.selector(this.name).type === 'object') {
                typename = 'keyword (options: ' + tree.Reference.selector(this.name).type.join(', ') + ')';
            } else {
                typename = tree.Reference.selector(this.name).type;
            }
            return env.error({
                message: 'Invalid value for ' +
                    this.name +
                    ', the type ' + typename +
                    ' is expected. ' + this.value +
                    ' (of type ' + this.value.value[0].is + ') ' +
                    ' was given.',
                index: this.index,
                type: 'syntax',
                filename: this.filename
            });
        }
    }

    if (this.variable) {
        return '';
    } else if (tree.Reference.isFont(this.name) && this.value.value.length > 1) {
        var f = tree._getFontSet(env, this.value.value);
        return 'fontset-name="' + f.name + '"';
    } else if (content) {
        return this.value.toString(env, this.name, sep);
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
tree.Rule.prototype['eval'] = function(context) {
    return new tree.Rule(this.name,
        this.value['eval'](context),
        this.index,
        this.filename);
};

})(require('../tree'));
