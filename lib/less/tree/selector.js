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

    return this._css = /* this.elements.map(function (e) {
        if (typeof(e) === 'string') {
            return ' ' + e.trim();
        } else {
            return e.toCSS(env);
        }
    }).join('') +  */
    this.filters.map(function (f) {
        return f.toCSS(env);
    }).join('');
};

})(require('less/tree'));
