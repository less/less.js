(function (tree) {

tree.Selector = function (elements) {
    this.elements = elements;
    if (this.elements[0].combinator.value === "") {
        this.elements[0].combinator.value = ' ';
    }
};
tree.Selector.prototype.match = function (other) {
    var value = this.elements[0].value,
        len   = this.elements.length,
        olen  = other.elements.length;

    if (len > olen) {
        return value === other.elements[0].value;
    }

    for (var i = 0; i < olen; i ++) {
        if (value === other.elements[i].value) {
            for (var j = 1; j < len; j ++) {
                if (this.elements[j].value !== other.elements[i + j].value) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
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
