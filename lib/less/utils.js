/* jshint proto: true */
var MATH = require('./math-constants');

var utils = {
    getLocation: function(index, inputStream) {
        var n = index + 1,
            line = null,
            column = -1;

        while (--n >= 0 && inputStream.charAt(n) !== '\n') {
            column++;
        }

        if (typeof index === 'number') {
            line = (inputStream.slice(0, index).match(/\n/g) || '').length;
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
    copyOptions: function(obj1, obj2) {
        var opts = utils.defaults(obj1, obj2);
        if (opts.strictMath) {
            opts.math = MATH.STRICT_LEGACY;
        }
        if (opts.hasOwnProperty('math') && typeof opts.math === 'string') {
            switch (opts.math.toLowerCase()) {
                case 'always':
                    opts.math = MATH.ALWAYS;
                    break;
                case 'parens-division':
                    opts.math = MATH.PARENS_DIVISION;
                    break;
                case 'strict':
                case 'parens':
                    opts.math = MATH.PARENS;
                    break;
                case 'strict-legacy':
                    opts.math = MATH.STRICT_LEGACY;
            }
        }
        return opts;
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
    flattenArray: function(arr, result) {
        result = result || [];
        for (var i = 0, length = arr.length; i < length; i++) {
            var value = arr[i];
            if (Array.isArray(value)) {
                utils.flattenArray(value, result);
            } else {
                if (value !== undefined) {
                    result.push(value);
                }
            }
        }
        return result;
    }
};

module.exports = utils;