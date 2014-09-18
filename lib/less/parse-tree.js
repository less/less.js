var LessError = require('./less-error'),
    transformTree = require("./transform-tree");

var ParseTree = function(root, imports) {
    this.root = root;
    this.imports = imports;
};

ParseTree.prototype.toCSS = function(options) {
    var evaldRoot;
    try {
        evaldRoot = transformTree(this.root, options);
    } catch (e) {
        throw new LessError(e, this.imports);
    }
    var css;
    try {
        var toCSSOptions = {
            compress: Boolean(options.compress),
            dumpLineNumbers: options.dumpLineNumbers,
            strictUnits: Boolean(options.strictUnits),
            numPrecision: 8};

        if (options.sourceMap) {
            css = options.sourceMap.toCSS(evaldRoot, toCSSOptions, this.imports);
        } else {
            css = evaldRoot.toCSS(toCSSOptions);
        }
    } catch (e) {
        throw new LessError(e, this.imports);
    }

    if (options.plugins) {
        var postProcessors = options.plugins.getPostProcessors();
        for(var i = 0; i < postProcessors.length; i++) {
            // TODO - pass source maps
            // TODO - async
            css = postProcessors[i].process(css, options);
        }
    }
    return css;
};
module.exports = ParseTree;
