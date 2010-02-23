
node.Selector = function Selector(elements) { this.elements = elements };
node.Selector.prototype.toCSS = function () {
    return this.elements.map(function (e) {
        if (typeof(e) === 'string') {
            return ' ' + e.trim();
        } else {
            return e.toCSS();
        }
    }).join('');
};

