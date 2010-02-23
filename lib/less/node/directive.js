
node.Directive = function Directive(name, value) {
    this.name = name;
    if (Array.isArray(value)) {
        this.rules = value;
    } else {
        this.value = value;
    }
};
node.Directive.prototype.toCSS = function () {
    if (this.rules) {

    } else {
        return this.name + ' ' + this.value.toCSS() + ';\n';
    }
};
