(function (tree) {

tree.URL = function (val, rootpath) {
    this.value = val;
    this.rootpath = rootpath
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + this.value.toCSS() + ")";
    },
    eval: function (ctx) {
        var val = this.value.eval(ctx);

        // Add the base path if the URL is relative and we are in the browser
        if (typeof window !== 'undefined' && typeof val.value === "string" && !/^(?:[a-z-]+:|\/)/.test(val.value)) {
            val.value = this.rootpath + val.value;
        }

        return new(tree.URL)(val, this.rootpath);
    }
};

})(require('../tree'));
