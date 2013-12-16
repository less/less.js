(function (tree) {

tree.URL = function (val, currentFileInfo) {
    this.value = val;
    this.currentFileInfo = currentFileInfo;
};
tree.URL.prototype = {
    type: "Url",
    accept: function (visitor) {
        this.value = visitor.visit(this.value);
    },
    genCSS: function (env, output) {
        output.add("url(");
        this.value.genCSS(env, output);
        output.add(")");
    },
    toCSS: tree.toCSS,
    eval: function (ctx) {
        var val = this.value.eval(ctx), currentDirectory;

        // Add the base path if the URL is relative
        currentDirectory = this.currentFileInfo && (this.currentFileInfo.currentDirectory || this.currentFileInfo.rootpath);
        if (currentDirectory && typeof val.value === "string" && ctx.isPathRelative(val.value)) {
            if (!val.quote) {
                currentDirectory = currentDirectory.replace(/[\(\)'"\s]/g, function(match) { return "\\"+match; });
            }
            val.value = currentDirectory + val.value;
        }

        val.value = ctx.normalizePath(val.value);

        return new(tree.URL)(val, null);
    }
};

})(require('../tree'));
