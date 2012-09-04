(function(tree) {

//
// A number with a unit
//
tree.Dimension = function Dimension(value, unit, index) {
    this.value = parseFloat(value);
    this.unit = unit || null;
    this.is = 'float';
    this.index = index;
};

tree.Dimension.prototype = {
    eval: function (env) {
        if (this.unit && ['px', '%'].indexOf(this.unit) === -1) {
             env.error({
                message: "Invalid unit: '" + this.unit + "'",
                index: this.index
            });
        }

        return this;
    },
    toColor: function() {
        return new tree.Color([this.value, this.value, this.value]);
    },
    round: function() {
        this.value = Math.round(this.value);
        return this;
    },
    toString: function() {
        return this.value.toString();
    },

    // In an operation between two Dimensions,
    // we default to the first Dimension's unit,
    // so `1px + 2em` will yield `3px`.
    // In the future, we could implement some unit
    // conversions such that `100cm + 10mm` would yield
    // `101cm`.
    operate: function(op, other) {
        return new tree.Dimension(tree.operate(op, this.value, other.value),
                  this.unit || other.unit);
    }
};

})(require('../tree'));
