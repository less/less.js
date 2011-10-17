(function (tree, when) {
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

tree.newImport = function(path, imports) {
    var css = /css(\?.*)?$/.test(path.value.value || path.value);
    if (css) {
        return new tree.CSSImport(path, imports);
    } else {
        return new tree.Import(path, imports);
    }
}

tree.CSSImport = function (path) {
    this._path = path;
};

tree.CSSImport.prototype = {
    toCSS: function () {
        return "@import " + this._path.toCSS() + ';\n';

    },
    eval: function (env) {
        if (this._path instanceof tree.Quoted) {
            this._path = this._path.eval(env);
        }
        return this;
    }
};


tree.Import = function (path, imports) {
    this._path = path;
    this._imports = imports;
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
    toCSS: function () {
        return "";
    },
    eval: function (env) {
        var path = this._path;
        var d = when.defer();

        // The '.less' extension is optional
        if (path instanceof tree.Quoted) {
            path = path.eval(env);
            path = /\.(le?|c)ss(\?.*)?$/.test(path.value) ? path.value : path.value + '.less';
        } else {
            path = path.value.value || path.value;
        }

        this._imports.push(path, function (root) {
            if (! root) {
                throw new(Error)("Error parsing " + path);
            }
            when.chain(root.evalImports(env, root.clone()), d);
        });
        return d.promise;
    }
};

})(require('less/tree'), require('less/when'));
