(function (tree) {
//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//
tree.Import = function (path, features, once, index, rootpath) {
    var that = this;

    this.once = once;
    this.index = index;
    this._path = path;
    this.features = features;
    this.rootpath = rootpath;
        
    // The '.less' extension is optional
    if (path instanceof tree.Quoted) {
        this.path = /(\.[a-z]*$)|([\?;].*)$/.test(path.value) ? path.value : path.value + '.less';
    } else {
        this.path = path.value.value || path.value;
    }

    this.css = /css([\?;].*)?$/.test(this.path);
};

//
// The actual import node doesn't return anything, when converted to CSS.
// The reason is that it's used at the evaluation stage, so that the rules
// it imports can be treated like any other rules.
//
// In `eval`, we make sure all Import nodes get evaluated, recursively, so
// we end up with a flat structure, which can easily be imported in the parent
// ruleset.
//
tree.Import.prototype = {
    type: "Import",
    accept: function (visitor) {
        this.features = visitor.visit(this.features);
        this._path = visitor.visit(this._path);
    },
    toCSS: function (env) {
        var features = this.features ? ' ' + this.features.toCSS(env) : '';

        if (this.css) {
            // Add the base path if the import is relative
            if (typeof this._path.value === "string" && !/^(?:[a-z-]+:|\/)/.test(this._path.value)) {
                this._path.value = this.rootpath + this._path.value;
            }
            return "@import " + this._path.toCSS() + features + ';\n';
        } else {
            return "";
        }
    },
    eval: function (env) {
        var ruleset, features = this.features && this.features.eval(env);

        if (this.skip) { return []; }

        if (this.css) {
            return new(tree.Import)(this._path, features, this.once, this.index, this.rootpath);
        } else {
            ruleset = new(tree.Ruleset)([], this.root.rules.slice(0));

            ruleset.evalImports(env);

            return this.features ? new(tree.Media)(ruleset.rules, this.features.value) : ruleset.rules;
        }
    }
};

})(require('../tree'));
