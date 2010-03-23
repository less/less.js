if (typeof(String.prototype.trim) === "undefined") {
    String.prototype.trim = function (str) {
        var str = this.replace(/^\s+/, '');
        for (var i = str.length - 1; i >= 0; i--) {
            if (/\S/.test(str.charAt(i))) {
                str = str.substring(0, i + 1);
                break;
            }
        }
        return str;
    };
}
