(function (tree) {

tree.Filter = function (key, op, val) {
    this.key = key;
    this.op = op;
    this.val = val;
    this.zooms = {
      '1': [200000000, 500000000],
      '2': [100000000, 200000000],
      '3': [50000000, 100000000],
      '4': [25000000, 50000000],
      '5': [12500000, 25000000],
      '6': [6500000, 12500000],
      '7': [3000000, 6500000],
      '8': [1500000, 3000000],
      '9': [750000, 1500000],
     '10': [400000, 750000],
     '11': [200000, 400000],
     '12': [100000, 200000],
     '13': [50000, 100000],
     '14': [25000, 50000],
     '15': [12500, 25000],
     '16': [5000, 12500],
     '17': [2500, 5000],
     '18': [1000, 2500],
     '19': [500, 1000],
     '20': [250, 500],
     '21': [100, 250],
     '22': [50, 100],
   };
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
