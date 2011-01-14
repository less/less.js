(function (tree) {

tree.Selector = function (elements) {
    this.elements = elements;
    this.filters = [];
    if (this.elements[0].combinator.value === "") {
        this.elements[0].combinator.value = ' ';
    }
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

    // return this._css = this.elements.map(function (f) {
    //     return f.toCSS(env).trim();
    // }).join('--');
    if (!tree.selector_cache) tree.selector_cache = {};

    var sel = this.elements.map(function (f) {
        return f.toCSS(env).trim();
    }).join('--');

    if (tree.selector_cache[sel]) {
        tree.selector_cache[sel]++;
    } else {
        tree.selector_cache[sel] = 1;
    }

    return this._css = sel + '-' + (tree.selector_cache[sel] || 0);
};

})(require('mess/tree'));
