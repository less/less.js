(function (tree) {

tree.URL = function (val, paths) {
    this.value = val;
    this.paths = paths;
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS() + ")";
    },
    eval: function (ctx) {
        var val = this.value.eval(ctx);

        // Rewrite the path per less.rewritePath
        if (less.rewritePath && typeof less.rewritePath === 'function'){
            val.value = less.rewritePath(val.value);
        }

        // Add the base path if the URL is relative and we are in the browser
        if (typeof window !== 'undefined' && typeof val.value === "string" && !/^(?:[a-z-]+:|\/)/.test(val.value) && this.paths.length > 0) {
            val.value = this.paths[0] + (val.value.charAt(0) === '/' ? val.value.slice(1) : val.value);
        }

        return new(tree.URL)(val, this.paths);
    }
};

})(require('../tree'));
