if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Directive = function Directive(name, value) {
    this.name = name;
    if (Array.isArray(value)) {
        this.rules = value;
    } else {
        this.value = value;
    }
};
tree.Directive.prototype.toCSS = function () {
    if (this.rules) {

    } else {
        return this.name + ' ' + this.value.toCSS() + ';\n';
    }
};
