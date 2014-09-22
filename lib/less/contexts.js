var contexts = {};
module.exports = contexts;

var copyFromOriginal = function copyFromOriginal(original, destination, propertiesToCopy) {
    if (!original) { return; }

    for(var i = 0; i < propertiesToCopy.length; i++) {
        if (original.hasOwnProperty(propertiesToCopy[i])) {
            destination[propertiesToCopy[i]] = original[propertiesToCopy[i]];
        }
    }
};

/*
 parseEnv is 2 things
 1. a set of options
 2. The context of the current file information
 */
var parseCopyProperties = [
    'paths',            // option - unmodified - paths to search for imports on
    'relativeUrls',     // option - whether to adjust URL's to be relative
    'rootpath',         // option - rootpath to append to URL's
    'strictImports',    // option -
    'insecure',         // option - whether to allow imports from insecure ssl hosts
    'dumpLineNumbers',  // option - whether to dump line numbers
    'compress',         // option - whether to compress
    'processImports',   // option - whether to process imports. if false then imports will not be imported
    'syncImport',       // option - whether to import synchronously
    'chunkInput',       // option - whether to chunk input. more performant but causes parse issues.
    'mime',             // browser only - mime type for sheet import
    'useFileCache',     // browser only - whether to use the per file session cache
    'currentFileInfo'   // information about the current file - for error reporting and importing and making urls relative etc.
];

//currentFileInfo = {
//  'relativeUrls' - option - whether to adjust URL's to be relative
//  'filename' - full resolved filename of current file
//  'rootpath' - path to append to normal URLs for this node
//  'currentDirectory' - path to the current file, absolute
//  'rootFilename' - filename of the base file
//  'entryPath' - absolute path to the entry file
//  'reference' - whether the file should not be output and only output parts that are referenced

contexts.parseEnv = function(options) {
    copyFromOriginal(options, this, parseCopyProperties);

    if (typeof this.paths === "string") { this.paths = [this.paths]; }

    if (!this.currentFileInfo) {
        var filename = (options && options.filename) || "input";
        var entryPath = filename.replace(/[^\/\\]*$/, "");
        if (options) {
            options.filename = null;
        }
        this.currentFileInfo = {
            filename: filename,
            relativeUrls: this.relativeUrls,
            rootpath: (options && options.rootpath) || "",
            currentDirectory: entryPath,
            entryPath: entryPath,
            rootFilename: filename
        };
    }
};

var evalCopyProperties = [
    'silent',         // whether to swallow errors and warnings
    'verbose',        // whether to log more activity
    'compress',       // whether to compress
    'ieCompat',       // whether to enforce IE compatibility (IE8 data-uri)
    'strictMath',     // whether math has to be within parenthesis
    'strictUnits',    // whether units need to evaluate correctly
    'sourceMap',      // whether to output a source map
    'importMultiple', // whether we are currently importing multiple copies
    'urlArgs',        // whether to add args into url tokens
    'javascriptEnabled'// option - whether JavaScript is enabled. if undefined, defaults to true
    ];

contexts.evalEnv = function(options, frames) {
    copyFromOriginal(options, this, evalCopyProperties);

    this.frames = frames || [];
};

contexts.evalEnv.prototype.inParenthesis = function () {
    if (!this.parensStack) {
        this.parensStack = [];
    }
    this.parensStack.push(true);
};

contexts.evalEnv.prototype.outOfParenthesis = function () {
    this.parensStack.pop();
};

contexts.evalEnv.prototype.isMathOn = function () {
    return this.strictMath ? (this.parensStack && this.parensStack.length) : true;
};

contexts.evalEnv.prototype.isPathRelative = function (path) {
    return !/^(?:[a-z-]+:|\/)/.test(path);
};

contexts.evalEnv.prototype.normalizePath = function( path ) {
    var
      segments = path.split("/").reverse(),
      segment;

    path = [];
    while (segments.length !== 0 ) {
        segment = segments.pop();
        switch( segment ) {
            case ".":
                break;
            case "..":
                if ((path.length === 0) || (path[path.length - 1] === "..")) {
                    path.push( segment );
                } else {
                    path.pop();
                }
                break;
            default:
                path.push( segment );
                break;
        }
    }

    return path.join("/");
};

//todo - do the same for the toCSS env
//tree.toCSSEnv = function (options) {
//};


