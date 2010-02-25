//
// RGB Colors - #ff0014, #eee
//
node.Color = function Color(val) {
    if (Array.isArray(val)) {
        this.value = val;
    } else if (val.length == 6) {
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
        var result = [];
        for (var c = 0; c < 3; c++) {
            result[c] = this.value[c] + other.value[c];
        }
        return new(node.Color)(result);
    },
    '-': function (other) {
        var result = [];
        for (var c = 0; c < 3; c++) {
            result[c] = this.value[c] - other.value[c];
        }
        return new(node.Color)(result);
    },
    '*': function (other) {
        var result = [];
        for (var c = 0; c < 3; c++) {
            result[c] = this.value[c] * other.value[c];
        }
        return new(node.Color)(result);
    },
    '/': function (other) {
        var result = [];
        for (var c = 0; c < 3; c++) {
            result[c] = this.value[c] / other.value[c];
        }
        return new(node.Color)(result);
    }
};

