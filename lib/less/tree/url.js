(function (tree) {

tree.URL = function (val, paths) {
    // Add the base path if the URL is relative and we are in the browser
    if (!/^(?:http:\/)?\//.test(val.value) &&
        paths.length > 0                   &&
        typeof(window) !== 'undefined') {
        val.value = [paths[0], val.value].join('/');
    }
    this.value = val;
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS() + ")";
    },
    eval: function (ctx) {
        this.value = this.value.eval(ctx);
        return this;
    }
};

})(require('less/tree'));
