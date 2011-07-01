(function (tree) {

tree.URL = function (val, paths) {
    if (val.data) {
        this.attrs = val;
    } else {
        // Add the base path if the URL is relative and we are in the browser
        if (!/^(?:https?:\/|file:\/|data:\/)?\//.test(val.value) && paths.length > 0 && typeof(window) !== 'undefined') {
            val.value = paths[0] + (val.value.charAt(0) === '/' ? val.value.slice(1) : val.value);
        }
        this.value = val;
        this.paths = paths;
    }
};
tree.URL.prototype = {
    toCSS: function () {
		var attrs = this.attrs,
			val = this.value,
			paths = this.paths;
		// adjust the paths for lessc
		if (val && !/^(?:https?:\/|file:\/)?\//.test(val.value) && paths.length > 0 && typeof(window) === 'undefined') {
			val.value = (paths[0].replace(/\/?$/, '/') + val.value)
		}
		return "url(" + (attrs ? 'data:' + attrs.mime + attrs.charset + attrs.base64 + attrs.data
		: val.toCSS()) + ")";
    },
    eval: function (ctx) {
        return this.attrs ? this : new(tree.URL)(this.value.eval(ctx), this.paths);
    }
};

})(require('less/tree'));
