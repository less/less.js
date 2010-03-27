if (typeof(String.prototype.trim) !== "function") {
    String.prototype.trim = function (str) {
        return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
}
