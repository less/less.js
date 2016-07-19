/* jshint proto: true */
module.exports = {
    getLocation: function(index, inputStream) {
        var n = index + 1,
            line = null,
            column = -1;

        while (--n >= 0 && inputStream.charAt(n) !== '\n') {
            column++;
        }

        if (typeof index === 'number') {
            line = (inputStream.slice(0, index).match(/\n/g) || "").length;
        }

        return {
            line: line,
            column: column
        };
    },
    copyArray: function(arr) {
        var i, length = arr.length,
            copy = new Array(length);
        
        for (i = 0; i < length; i++) {
            copy[i] = arr[i];
        }
        return copy;
    },
    getPrototype: function(obj) {
        if (Object.getPrototypeOf) {
            return Object.getPrototypeOf(obj);
        }
        else {
            if ("".__proto__ === String.prototype) {
                return obj.__proto__;
            }
            else if (obj.constructor) {
                return obj.constructor.prototype;
            }
        }
    }
};
