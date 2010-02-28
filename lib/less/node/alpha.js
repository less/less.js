node.Alpha = function Alpha(val) {
    this.value = val;
};
node.Alpha.prototype = {
    toCSS: function () {
        return "alpha(opacity=" + this.value.toCSS ? this.value.toCSS() : this.value + ")";
    }
};
