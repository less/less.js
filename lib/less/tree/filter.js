(function (tree) {

tree.Filter = function (key, op, val) {
    this.key = key;
    this.op = op;
    this.val = val;
};
/*
 * tree.Attribute.prototype.match = function (other) {
    if (this.elements[0].value === other.elements[0].value) {
        return true;
    } else {
        return false;
    }
};
*/
tree.Filter.prototype.toCSS = function (env) {
    if (this.val.is) {
        this.val = this.val.toCSS();
    }
    return '<Filter>[' + this.key + '] ' +
        this.op.toCSS() +
        ' ' +
        this.val +
        '</Filter>';
};

})(require('less/tree'));
