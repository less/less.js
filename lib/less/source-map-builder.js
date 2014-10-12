module.exports = function (SourceMapOutput) {

    var SourceMapBuilder = function (options) {
        this.options = options;
    };

    SourceMapBuilder.prototype.toCSS = function(rootNode, options, imports) {
        var sourceMapOutput = new SourceMapOutput(
            {
                contentsIgnoredCharsMap: imports.contentsIgnoredChars,
                rootNode: rootNode,
                contentsMap: imports.contents,
                sourceMapFilename: this.options.sourceMapFilename,
                sourceMapURL: this.options.sourceMapURL,
                outputFilename: this.options.sourceMapOutputFilename,
                sourceMapBasepath: this.options.sourceMapBasepath,
                sourceMapRootpath: this.options.sourceMapRootpath,
                outputSourceFiles: this.options.outputSourceFiles,
                sourceMapGenerator: this.options.sourceMapGenerator,
                sourceMapFileInline: this.options.sourceMapFileInline
            });

        var css = sourceMapOutput.toCSS(options);
        this.sourceMap = sourceMapOutput.sourceMap;
        this.sourceMapURL = sourceMapOutput.sourceMapURL;
        if (this.options.sourceMapInputFilename) {
            this.sourceMapInputFilename = sourceMapOutput.normalizeFilename(this.options.sourceMapInputFilename);
        }
        return css;
    };

    SourceMapBuilder.prototype.getExternalSourceMap = function() {
        return this.sourceMap;
    };
    SourceMapBuilder.prototype.setExternalSourceMap = function(sourceMap) {
        this.sourceMap = sourceMap;
    };

    SourceMapBuilder.prototype.isInline = function() {
        return this.options.sourceMapFileInline;
    };
    SourceMapBuilder.prototype.getSourceMapURL = function() {
        return this.sourceMapURL;
    };
    SourceMapBuilder.prototype.getOutputFilename = function() {
        return this.options.sourceMapOutputFilename;
    };
    SourceMapBuilder.prototype.getInputFilename = function() {
        return this.sourceMapInputFilename;
    };

    return SourceMapBuilder;
};
