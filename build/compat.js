if (typeof(String.prototype.trim) !== "function") {
    String.prototype.trim = function (str) {
        return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
}
if (typeof(Array.isArray) !== "function") {
    Array.isArray = function (a) {
        if (a instanceof Array) {
            return true;
        } else {
            return false;
        }
    }
}
