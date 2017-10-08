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
    clone: function (obj) {
        var cloned = {};
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                cloned[prop] = obj[prop];
            }
        }
        return cloned;
    },
    defaults: function(obj1, obj2) {
        if (!obj2._defaults || obj2._defaults !== obj1) {
            for (var prop in obj1) {
                if (obj1.hasOwnProperty(prop)) {
                    if (!obj2.hasOwnProperty(prop)) {
                        obj2[prop] = obj1[prop];
                    }
                    else if (Array.isArray(obj1[prop])
                        && Array.isArray(obj2[prop])) {

                        obj1[prop].forEach(function(p) {
                            if (obj2[prop].indexOf(p) === -1) {
                                obj2[prop].push(p);
                            }
                        });
                    }
                }
            }
        }
        obj2._defaults = obj1;
        return obj2;
    },
    merge: function(obj1, obj2) {
        for (var prop in obj2) {
            if (obj2.hasOwnProperty(prop)) {
                obj1[prop] = obj2[prop];
            }
        }
        return obj1;
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
