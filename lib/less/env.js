(function (tree) {

    var parseCopyProperties = [
        'paths',            // paths to search for imports on
        'optimization',     // option - optimization level (for the chunker)
        'filename',         // current filename, used for error reporting
        'files',            // list of files that have been imported, used for import-once
        'contents',         // browser-only, contents of all the files
        'rootpath',         // current rootpath to append to all url's
        'relativeUrls',     // option - whether to adjust URL's to be relative
        'strictImports',    // option -
        'dumpLineNumbers',  // option - whether to dump line numbers
        'compress',         // option - whether to compress
        'ieCompat',         // option - whether to enforce IE compatibility (IE8 data-uri)
        'mime',             // browser only - mime type for sheet import
        'entryPath',        // browser only - path of entry less file
        'rootFilename',     // browser only - href of the entry less file
        'currentDirectory'  // node only - the current directory
    ];

    tree.parseEnv = function(options) {
        copyFromOriginal(options, this, parseCopyProperties);

        if (!this.contents) { this.contents = {}; }
        if (!this.rootpath) { this.rootpath = ''; }
        if (!this.files) { this.files = {}; }
    };

    tree.parseEnv.prototype.toSheet = function (path) {
        var env = new tree.parseEnv(this);
        env.href = path;
        //env.title = path;
        env.type = this.mime;
        return env;
    };

    var evalCopyProperties = [
        'compress',    // whether to compress
        'strictMaths', // whether maths has to be within parenthesis
        'strictUnits'  // whether units need to evaluate correctly
        ];

    tree.evalEnv = function(options, frames) {
        copyFromOriginal(options, this, evalCopyProperties);

        this.frames = frames || [];
    };

    tree.evalEnv.prototype.inParenthesis = function () {
        if (!this.parensStack) {
            this.parensStack = [];
        }
        this.parensStack.push(true);
    };

    tree.evalEnv.prototype.outOfParenthesis = function () {
        this.parensStack.pop();
    };

    tree.evalEnv.prototype.isMathsOn = function () {
        return this.strictMaths === false ? true : (this.parensStack && this.parensStack.length);
    };

    tree.evalEnv.prototype.isPathRelative = function (path) {
        return !/^(?:[a-z-]+:|\/)/.test(path);
    };

    //todo - do the same for the toCSS env
    //tree.toCSSEnv = function (options) {
    //};

    var copyFromOriginal = function(original, destination, propertiesToCopy) {
        if (!original) { return; }

        for(var i = 0; i < propertiesToCopy.length; i++) {
            if (original.hasOwnProperty(propertiesToCopy[i])) {
                destination[propertiesToCopy[i]] = original[propertiesToCopy[i]];
            }
        }
    }
})(require('./tree'));