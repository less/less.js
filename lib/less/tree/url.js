(function (tree) {

tree.URL = function (val, paths) {
    // Add the base path if the URL is relative and we are in the browser
    if (!/^(?:https?:\/|file:\/)?\//.test(val.value) && paths.length > 0 && typeof(window) !== 'undefined') {
        val.value = paths[0] + (val.value.charAt(0) === '/' ? val.value.slice(1) : val.value);
    }
    this.value = val;
    this.paths = paths;
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS() + ")";
    },
    eval: function (ctx) {
        return new(tree.URL)(this.value.eval(ctx), this.paths);
    }
};

})(require('less/tree'));
