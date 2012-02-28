(function (tree) {

tree.Element = function (combinator, value, index) {
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
};
tree.Element.prototype.eval = function (env) {
    return new(tree.Element)(this.combinator,
                             this.value.eval ? this.value.eval(env) : this.value,
                             this.index);
};
tree.Element.prototype.toCSS = function (env) {
    return this.combinator.toCSS(env || {}) + (this.value.toCSS ? this.value.toCSS(env) : this.value);
};

tree.Combinator = function (value) {
    if (value === ' ') {
        this.value = ' ';
    } else if (value === '& ') {
        this.value = '& ';
    } else {
        this.value = value ? value.trim() : "";
    }
};
tree.Combinator.prototype.toCSS = function (env) {
    return {
        ''  : '',
        ' ' : ' ',
        '&' : '',
        '& ' : ' ',
        ':' : ' :',
        '+' : env.compress ? '+' : ' + ',
        '~' : env.compress ? '~' : ' ~ ',
        '>' : env.compress ? '>' : ' > '
    }[this.value];
};

})(require('../tree'));
