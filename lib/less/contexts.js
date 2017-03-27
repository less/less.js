var contexts = {};
module.exports = contexts;

var copyFromOriginal = function copyFromOriginal(original, destination, propertiesToCopy) {
    if (!original) { return; }

    for (var i = 0; i < propertiesToCopy.length; i++) {
        if (original.hasOwnProperty(propertiesToCopy[i])) {
            destination[propertiesToCopy[i]] = original[propertiesToCopy[i]];
        }
    }
};

/*
 parse is used whilst parsing
 */
var parseCopyProperties = [
    // options
    'paths',            // option - unmodified - paths to search for imports on
    'rewriteUrls',      // option - whether to adjust URL's to be relative
    'rootpath',         // option - rootpath to append to URL's
    'strictImports',    // option -
    'insecure',         // option - whether to allow imports from insecure ssl hosts
    'dumpLineNumbers',  // option - whether to dump line numbers
    'compress',         // option - whether to compress
    'syncImport',       // option - whether to import synchronously
    'chunkInput',       // option - whether to chunk input. more performant but causes parse issues.
    'mime',             // browser only - mime type for sheet import
    'useFileCache',     // browser only - whether to use the per file session cache
    // context
    'processImports',   // option & context - whether to process imports. if false then imports will not be imported.
                        // Used by the import manager to stop multiple import visitors being created.
    'pluginManager'     // Used as the plugin manager for the session
];

contexts.Parse = function(options) {
    copyFromOriginal(options, this, parseCopyProperties);

    if (typeof this.paths === 'string') { this.paths = [this.paths]; }
};

var evalCopyProperties = [
    'paths',          // additional include paths
    'rewriteUrls',    // option - whether to adjust URL's to be relative
    'compress',       // whether to compress
    'ieCompat',       // whether to enforce IE compatibility (IE8 data-uri)
    'strictMath',     // whether math has to be within parenthesis
    'strictUnits',    // whether units need to evaluate correctly
    'sourceMap',      // whether to output a source map
    'importMultiple', // whether we are currently importing multiple copies
    'urlArgs',        // whether to add args into url tokens
    'javascriptEnabled',// option - whether Inline JavaScript is enabled. if undefined, defaults to false
    'pluginManager',  // Used as the plugin manager for the session
    'importantScope'  // used to bubble up !important statements
];

contexts.Eval = function(options, frames) {
    copyFromOriginal(options, this, evalCopyProperties);

    if (typeof this.paths === 'string') { this.paths = [this.paths]; }

    this.frames = frames || [];
    this.importantScope = this.importantScope || [];
};

contexts.Eval.prototype.inParenthesis = function () {
    if (!this.parensStack) {
        this.parensStack = [];
    }
    this.parensStack.push(true);
};

contexts.Eval.prototype.outOfParenthesis = function () {
    this.parensStack.pop();
};

contexts.Eval.prototype.isMathOn = function () {
    return this.strictMath ? (this.parensStack && this.parensStack.length) : true;
};

contexts.Eval.prototype.pathRequiresRewrite = function (path) {
    var isRelative = this.rewriteUrls === 'relative' ? isPathExplicitRelative : isPathRelative;

    return isRelative(path);
};

contexts.Eval.prototype.rewritePath = function (path, rootpath) {
    var newPath;

    rootpath = rootpath || '';
    newPath = this.normalizePath(rootpath + path);

    // If a path was explicit relative and the rootpath was not an absolute path
    // we must ensure that the new path is also explicit relative.
    if (isPathExplicitRelative(path) &&
        isPathRelative(rootpath) &&
        isPathExplicitRelative(newPath) === false) {
        newPath = './' + newPath;
    }

    return newPath;
};

contexts.Eval.prototype.normalizePath = function (path) {
    var
        segments = path.split('/').reverse(),
        segment;

    path = [];
    while (segments.length !== 0) {
        segment = segments.pop();
        switch (segment) {
            case '.':
                break;
            case '..':
                if ((path.length === 0) || (path[path.length - 1] === '..')) {
                    path.push(segment);
                } else {
                    path.pop();
                }
                break;
            default:
                path.push(segment);
                break;
        }
    }

    return path.join('/');
};

function isPathRelative(path) {
    return !/^(?:[a-z-]+:|\/|#)/i.test(path);
}

function isPathExplicitRelative(path) {
    return path.charAt(0) === '.';
}

//todo - do the same for the toCSS ?
