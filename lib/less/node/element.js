if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Element = function Element(combinator, value) {
    this.combinator = combinator || new(tree.Combinator);
    this.value = value.trim();
};
tree.Element.prototype.toCSS = function () {
    return this.combinator.toCSS() + this.value;
};

tree.Combinator = function Combinator(value) {
    this.value = value ? value.trim() : "";
};
tree.Combinator.prototype.toCSS = function () {
    switch (this.value) {
        case '&' : return '';
        case ':' : return ' :';
        case '::': return '::';
        case '+' : return ' + ';
        case '~' : return ' ~ ';
        case '>' : return ' > ';
        default  : return ' ' + this.value;
    }
};
