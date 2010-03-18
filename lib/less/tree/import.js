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
// 2. The current file finishes parsing, and is evaluated before the import.
// In this case, the rules aren't available yet, so we save
// the callback in `this.callback` [2b], which will be called when
// the importer is done [2a].
//
tree.Import = function Import(path, importer) {
    var that = this;

    // The '.less' extension is optional
    if (path instanceof tree.Quoted) {
        this.path = /\.le?ss$/.test(path.content) ? path.content : path.content + '.less';
    } else {
        this.path = path.value;
    }

    importer(this.path, function (rules) {
        if (this.callback) {
            this.callback(rules); // 2a.
        } else {
            that.rules = rules; // 1a.
        }
    });
};
tree.Import.prototype = {
    toCSS: function () { return "" },
    eval: function (callback) {
        if (this.rules) {
            callback(this.rules); // 1b.
        } else {
            this.callback = callback; // 2b.
        }
    }
};
