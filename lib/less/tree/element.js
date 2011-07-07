(function (tree) {

tree.Element = function (combinator, value, args) {
    this.combinator = combinator instanceof tree.Combinator ?
                      combinator : new(tree.Combinator)(combinator);
    this.value = value ? value.trim() : "";
    this.arguments = args;
};
tree.Element.prototype.toCSS = function (env) {
    var args = '';
    if (this.arguments!=null) {
        args = '(' + this.arguments.map(function (a) { return a.toCSS(); }).join(', ') + ')';
    }
    return this.combinator.toCSS(env || {}) + this.value + args;
};
tree.Element.prototype.eval =  function (env) {
    this.arguments = this.arguments && this.arguments.map(function (a) { return a.eval(env) }) || null;
    return this;
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
        '::': '::',
        '+' : env.compress ? '+' : ' + ',
        '~' : env.compress ? '~' : ' ~ ',
        '>' : env.compress ? '>' : ' > '
    }[this.value];
};

})(require('less/tree'));
