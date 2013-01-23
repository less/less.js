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
        'mime',             // browser only - mime type for sheet import
        'entryPath'         // browser only, path of entry less file
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

    //todo - do the same for the eval env and the toCSS env
    //tree.evalEnv = function(options) {
    //};

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