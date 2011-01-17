(function (tree) {

tree.Element = function (combinator, value) {
    this.combinator = combinator instanceof tree.Combinator ?
                      combinator : new(tree.Combinator)(combinator);
    this.value = value.toCSS ? value.toCSS() : value.trim();
    console.log(combinator.toCSS() + ' and val:' + this.value );
};

tree.Element.prototype.toCSS = function (env) {
    return this.combinator.toCSS() + this.value;
};

tree.Combinator = function (value) {
    if (value === ' ') {
        this.value = ' ';
    } else {
        this.value = value ? value.trim() : '';
    }
};

tree.Combinator.prototype.toCSS = function () {
    return {
        ''  : '',
        ' ' : ' ',
        '&' : '',
        ':' : ' :',
        '::': '::',
        '+' : '+',
        '~' : '~',
        '>' : '>'
    }[this.value];
};

})(require('mess/tree'));
