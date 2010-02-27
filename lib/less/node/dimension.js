
node.Dimension = function Dimension(value, unit) {
    this.value = parseFloat(value);
    this.unit = unit || null;
};

node.Dimension.prototype = {
    eval: function () { return this },
    toColor: function () {
        return new(node.Color)([this.value, this.value, this.value]);
    },
    toCSS: function () {
        var css = this.value + this.unit;
        return css;
    },
    operate: function (op, other) {
        return new(node.Dimension)
                  (node.operate(op, this.value, other.value),
                  this.unit);
    }
};

