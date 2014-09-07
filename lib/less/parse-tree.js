var LessError = require('./less-error'),
    transformTree = require("./transform-tree");

module.exports = function(environment)
{
var SourceMapOutput = require("./source-map-output")(environment);

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
        if (options.sourceMap) {
            evaldRoot = new SourceMapOutput(
                {
                    contentsIgnoredCharsMap: this.imports.contentsIgnoredChars,
                    writeSourceMap: options.writeSourceMap,
                    rootNode: evaldRoot,
                    contentsMap: this.imports.contents,
                    sourceMapFilename: options.sourceMapFilename,
                    sourceMapURL: options.sourceMapURL,
                    outputFilename: options.sourceMapOutputFilename,
                    sourceMapBasepath: options.sourceMapBasepath,
                    sourceMapRootpath: options.sourceMapRootpath,
                    outputSourceFiles: options.outputSourceFiles,
                    sourceMapGenerator: options.sourceMapGenerator
                });
        }

        css = evaldRoot.toCSS({
            compress: Boolean(options.compress),
            dumpLineNumbers: options.dumpLineNumbers,
            strictUnits: Boolean(options.strictUnits),
            numPrecision: 8});
    } catch (e) {
        throw new LessError(e, this.imports);
    }

    if (options.compress) {
        return css.replace(/(^(\s)+)|((\s)+$)/g, "");
    } else {
        return css;
    }
};
return ParseTree;
};
