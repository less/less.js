var LessError = require('./less-error'),
    transformTree = require("./transform-tree");

var ParseTree = function(root, imports) {
    this.root = root;
    this.imports = imports;
};

ParseTree.prototype.toCSS = function(options) {
    var evaldRoot, result = {};
    try {
        evaldRoot = transformTree(this.root, options);
    } catch (e) {
        throw new LessError(e, this.imports);
    }

    try {
        var toCSSOptions = {
            compress: Boolean(options.compress),
            dumpLineNumbers: options.dumpLineNumbers,
            strictUnits: Boolean(options.strictUnits),
            numPrecision: 8};

        if (options.sourceMap) {
            result.css = options.sourceMap.toCSS(evaldRoot, toCSSOptions, this.imports);
        } else {
            result.css = evaldRoot.toCSS(toCSSOptions);
        }
    } catch (e) {
        throw new LessError(e, this.imports);
    }

    if (options.plugins) {
        var postProcessors = options.plugins.getPostProcessors();
        for(var i = 0; i < postProcessors.length; i++) {
            // TODO - pass source maps
            // TODO - async
            result.css = postProcessors[i].process(result.css, options, this.imports);
        }
    }
    if (options.sourceMap) {
        result.map = options.sourceMap.getExternalSourceMap();
    }
    return result;
};
module.exports = ParseTree;
