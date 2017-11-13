/* jshint proto: true */
export function getLocation(index, inputStream) {
    let n = index + 1,
        line = null,
        column = -1;

    while (--n >= 0 && inputStream.charAt(n) !== '\n') {
        column++;
    }

    if (typeof index === 'number') {
        line = (inputStream.slice(0, index).match(/\n/g) || "").length;
    }

    return {
        line,
        column
    };
}
export function copyArray(arr) {
    let i;
    const length = arr.length;
    const copy = new Array(length);

    for (i = 0; i < length; i++) {
        copy[i] = arr[i];
    }
    return copy;
}
export function getPrototype(obj) {
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
