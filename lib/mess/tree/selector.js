(function (tree) {

tree.Selector = function (elements) {
    this.elements = elements;
    this.filters = [];
};

tree.Selector.prototype.match = function (other) {
    if (this.elements[0].value === other.elements[0].value) {
        return true;
    } else {
        return false;
    }
};

tree.Selector.prototype.toCSS = function (env) {
    if (this._css) { return this._css }

    if (!tree.selector_cache) tree.selector_cache = {};

    var sel = this.elements.map(function (f) {
        return f.toCSS(env).trim();
    }).join('_');

    return this._css = sel;
};

})(require('mess/tree'));
