module.exports = function (SourceMapOutput) {

    var SourceMapBuilder = function (options) {
        this.options = options;
    };

    SourceMapBuilder.prototype.toCSS = function(rootNode, options, imports) {
        this.sourceMapOutput = new SourceMapOutput(
            {
                contentsIgnoredCharsMap: imports.contentsIgnoredChars,
                writeSourceMap: this.options.writeSourceMap,
                rootNode: rootNode,
                contentsMap: imports.contents,
                sourceMapFilename: this.options.sourceMapFilename,
                sourceMapURL: this.options.sourceMapURL,
                outputFilename: this.options.sourceMapOutputFilename,
                sourceMapBasepath: this.options.sourceMapBasepath,
                sourceMapRootpath: this.options.sourceMapRootpath,
                outputSourceFiles: this.options.outputSourceFiles,
                sourceMapGenerator: this.options.sourceMapGenerator
            });

        return this.sourceMapOutput.toCSS(options);
    };

    return SourceMapBuilder;
};
