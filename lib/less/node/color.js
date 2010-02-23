//
// RGB Colors - #ff0014, #eee
//
node.Color = function Color(val) {
    if (val.length == 6) {
        this.value = val.match(/.{2}/g).map(function (c) {
            return parseInt(c, 16);
        });
    } else {
        this.value = val.split('').map(function (c) {
            return parseInt(c + c, 16);
        });
    }
};
node.Color.prototype = {
    eval: function () { return this },
    toCSS: function () {
        return '#' + this.value.map(function (i) {
            return i.toString(16);
        }).join('');
    },
    '+': function (other) {
        return new(node.Color)
                  (this.value + other.value, this.unit);
    },
    '-': function (other) {
        return new(node.Color)
                  (this.value - other.value, this.unit);
    },
    '*': function (other) {
        return new(node.Color)
                  (this.value * other.value, this.unit);
    },
    '/': function (other) {
        return new(node.Color)
                  (this.value / other.value, this.unit);
    }
};

