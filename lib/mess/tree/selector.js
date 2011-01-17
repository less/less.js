(function (tree) {

tree.Selector = function (elements) {
    this.elements = elements;
    this.filters = [];
};

tree.Selector.prototype.specificity = function () {
    return parseInt(_.reduce(this.elements, function(memo, e) {
        var spec = e.specificity();
        memo[0] += spec[0];
        memo[1] += spec[1];
        return memo;
    }, [0, 0]).join(''));
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

    var sel = this.elements.map(function (f) {
        return f.toCSS(env).trim();
    }).join('_');

    return this._css = sel;
};

})(require('mess/tree'));
