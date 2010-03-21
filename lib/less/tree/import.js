if (typeof(require) !== 'undefined') { var tree = require('less/tree') }
//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// What we do is pass the `importer` function a callback, which it
// will call when the file is available. Meanwhile, we continue parsing
// the input. The `eval` function also takes a callback, which we call
// inside the first callback [2a], depending on what was called first.
// At this point, two things can happen:
//
// 1. The import is loaded and parsed before the current file finishes
// parsing, in which case, we save the imported rules in `this.rules` [1a],
// and when `this.eval` is called (during code-gen), we pass the
// imported rules to the callback [1b].
//
// 2. The current file finishes parsing before the import.
// In this case, the rules aren't available yet, so we save
// the callback in `this.callback` [2b], which will be called when
// the importer is done [2a].
//
tree.Import = function Import(path, import) {
    var that = this;

    // The '.less' extension is optional
    if (path instanceof tree.Quoted) {
        this.path = /\.(le?|c)ss$/.test(path.content) ? path.content : path.content + '.less';
    } else {
        this.path = path.value.content || path.value;
    }

    import.push(this.path, function (root) {
        that.root = root; // 1a.
    });
};
tree.Import.prototype = {
    toCSS: function () { return "" },
    eval: function () {
        for (var i = 0; i < this.root.rules.length; i++) {
            if (this.root.rules[i] instanceof tree.Import) {
                Array.prototype
                     .splice
                     .apply(this.root.rules,
                            [i, 1].concat(this.root.rules[i].eval()));
            }
        }
        return this.root.rules;
    }
};
