
node.Dimension = function Dimension(value, unit) {
    this.value = parseFloat(value);
    this.unit = unit || null;
};

node.Dimension.prototype = {
    eval: function () { return this },
    toCSS: function () {
        var css = this.value + this.unit;
        return css;
    },
    '+': function (other) {
        return new(node.Dimension)
                  (this.value + other.value, this.unit);
    },
    '-': function (other) {
        return new(node.Dimension)
                  (this.value - other.value, this.unit);
    },
    '*': function (other) {
        return new(node.Dimension)
                  (this.value * other.value, this.unit);
    },
    '/': function (other) {
        return new(node.Dimension)
                  (this.value / other.value, this.unit);
    }
};

