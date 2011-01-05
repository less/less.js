(function (tree) {

tree.Attribute = function (key, op, val) {
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
tree.Attribute.prototype.toCSS = function (env) {
    return '<Filter>[' + this.key + '] ' +
        this.op +
        ' ' +
        this.val +
        '</Filter>';
};

})(require('mess/tree'));
