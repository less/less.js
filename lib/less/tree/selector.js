(function (tree) {

tree.Selector = function (elements) {
    this.elements = elements;
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
tree.Selector.prototype.eval =  function (env) {
    for (var i = 0; i < this.elements.length; i++) {
        if (this.elements[i].arguments && this.elements[i].arguments.length > 0) {
            Array.prototype.splice
               .apply(this.elements, [i, 1].concat(this.elements[i].eval(env)));
        }
    }
    return this;
};
tree.Selector.prototype.toCSS = function (env) {
    if (this._css) { return this._css }

    return this._css = this.elements.map(function (e) {
        if (typeof(e) === 'string') {
            return ' ' + e.trim();
        } else {
            return e.toCSS(env);
        }
    }).join('');
};

})(require('less/tree'));
