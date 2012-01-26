(function (tree) {

tree.URL = function (val, paths) {
    if (val.data) {
        this.attrs = val;
    } else {        
        this.value = val;
        this.paths = paths;
    }
};
tree.URL.prototype = {
    toCSS: function () {
        return "url(" + (this.attrs ? 'data:' + this.attrs.mime + this.attrs.charset + this.attrs.base64 + this.attrs.data
                                    : this.value.toCSS()) + ")";
    },
    eval: function (ctx) {
        if (this.attrs) {
            return this;
        }
        var val = this.value.eval(ctx);
        var paths = this.paths;
        // Add the base path if the URL is relative and we are in the browser
        if (typeof(window) !== 'undefined' && !/^(?:https?:\/\/|file:\/\/|data:|\/)/.test(val.value) && paths.length > 0) {
            val.value = paths[0] + (val.value.charAt(0) === '/' ? val.value.slice(1) : val.value);
        }
        return new(tree.URL)(val, paths);
    }
};

})(require('../tree'));
