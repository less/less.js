
node.URL = function URL(val) {
    this.value = val;
};
node.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS ? this.value.toCSS() : this.value + ")";
    }
};
