if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Selector = function Selector(elements) { this.elements = elements };
tree.Selector.prototype.match = function (other) {
    if (this.elements[0].value === other.elements[0].value) {
        return true;
    } else {
        return false;
    }
};
tree.Selector.prototype.toCSS = function () {
    return this.elements.map(function (e) {
        if (typeof(e) === 'string') {
            return ' ' + e.trim();
        } else {
            return e.toCSS();
        }
    }).join('');
};

