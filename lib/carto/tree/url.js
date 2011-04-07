(function(tree) {

tree.URL = function URL(val, paths) {
    if (val.data) {
        this.attrs = val;
    } else {
        // Add the base path if the URL is relative and we are in the browser
        if (!/^(?:https?:\/|file:\/)?\//.test(val.value) && paths.length > 0 && typeof(process) === 'undefined') {
            val.value = paths[0] + (val.value.charAt(0) === '/' ? val.value.slice(1) : val.value);
        }
        this.value = val;
        this.paths = paths;
        this.is = 'uri';
    }
};
tree.URL.prototype = {
    toString: function() {
        return this.value.toString();
    },
    eval: function(ctx) {
        if (/^https?:/.test(this.value.toString())) {
            var crypto = require('crypto'),
                path = require('path');
            var uri = this.value.toString();
            var eventual_location = path.join(
                ctx.data_dir,
                crypto.createHash('md5').update(uri).digest('hex') + path.extname(uri));
            ctx.deferred_externals.push(this.value.toString());
            return this.attrs ? this : new tree.URL(eventual_location, this.paths);
        } else {
            return this.attrs ? this : new tree.URL(this.value.eval(ctx), this.paths);
        }
    }
};

})(require('carto/tree'));
