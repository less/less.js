"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Generalized list-merging utility, used for selectors and values
 *   e.g.
 *     .a, .b, .c {
 *        .d&.e {}
 *     }
 *   [.d, [.a, .b, .c], .e]
 */
exports.mergeList = function (arr) {
    var result = [arr];
    arr.forEach(function (item, o) {
        if (Array.isArray(item)) {
            item.forEach(function (val, i) {
                result.forEach(function (res) {
                    if (i !== 0) {
                        res = __spreadArrays(res);
                    }
                    res[o] = val;
                    if (i !== 0) {
                        result.push(res);
                    }
                });
            });
        }
        else {
            result.forEach(function (res) {
                res[o] = item;
            });
        }
    });
    return result;
};
/**
 * Math for node expressions
 */
exports.add = function (a, b) { return a + b; };
exports.subtract = function (a, b) { return a - b; };
exports.multiply = function (a, b) { return a * b; };
exports.divide = function (a, b) { return a / b; };
// export const operate = (op: string, a: number, b: number) => {
//   switch (op) {
//     case '+': return a + b
//     case '-': return a - b
//     case '*': return a * b
//     case '/': return a / b
//   }
// }
exports.fround = function (context, value) {
    var precision = context && context.numPrecision;
    // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
    return (precision) ? Number((value + 2e-16).toFixed(precision)) : value;
};
exports.compare = function (a, b) {
    /* returns:
     -1: a < b
     0: a = b
     1: a > b
     and *any* other value for a != b (e.g. undefined, NaN, -2 etc.)
    */
    /** Quick string comparison */
    if (a.text && b.text && a.text === b.text) {
        return 0;
    }
    var aVal = a.value;
    var bVal = b.value;
    if (Array.isArray(bVal) && !Array.isArray(aVal)) {
        return undefined;
    }
    if (Array.isArray(aVal)) {
        var aLength = aVal.length;
        var lt_1 = 0;
        var gt_1 = 0;
        var eq_1 = 0;
        if (!Array.isArray(bVal)) {
            return undefined;
        }
        if (aVal.length !== bVal.length) {
            return undefined;
        }
        aVal.forEach(function (val, index) {
            if (val < bVal[index]) {
                lt_1++;
            }
            if (val > bVal[index]) {
                gt_1++;
            }
            if (val == bVal[index]) {
                eq_1++;
            }
        });
        if (lt_1 === aLength) {
            return -1;
        }
        else if (gt_1 === aLength) {
            return 1;
        }
        else if (eq_1 === aLength) {
            return 0;
        }
        else {
            return undefined;
        }
    }
    return exports.numericCompare(aVal, bVal);
};
exports.numericCompare = function (a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    /** Type coercion comparison */
    if (a == b) {
        return 0;
    }
};
//# sourceMappingURL=util.js.map