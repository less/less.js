
node.Element = function Element(combinator, value) {
    this.combinator = combinator;
    this.value = value.trim();
};
node.Element.prototype.toCSS = function () {
    var css = (this.combinator ? this.combinator.toCSS() : ' ') + this.value;
    return css;
};

node.Combinator = function Combinator(value) {
    this.value = value.trim();
};
node.Combinator.prototype.toCSS = function () {
    switch (this.value) {
        case '&': return "";
        case ':': return ' :';
        case '>': return ' > ';
        default:  return ' ' + this.value;
    }
};
