(function (tree) {
    var sourceMap = require("source-map");

    tree.sourceMapOutput = function (sourceMapFilename, rootNode) {
        this._css = [];
        this._rootNode = rootNode;
        this._sourceMapFilename = sourceMapFilename;

        this._lineNumber = 0;
        this._column = 0;
    };

    tree.sourceMapOutput.prototype.add = function(chunk, index, fileInfo) {
        if (true) { //fileInfo.filename hasn't had source mapped
            //this._sourceMapGenerator.setSourceContent(fileInfo.filename, fileInfo.source);
        }
        if (fileInfo) {
            this._sourceMapGenerator.addMapping({ generated: { line: this._lineNumber, column: this._column}, original: { line: 1, column: 1}, source: fileInfo.filename});
        }
        if (!chunk) {
            //TODO what is calling this with undefined?
            return;
        }
        var lines = chunk.split("\n"),
            columns = lines[lines.length-1];

        this._lineNumber += lines.length - 1;
        this._column += columns.length - 1;

        this._css.push(chunk);
    };

    tree.sourceMapOutput.prototype.toCSS = function(env) {
        this._sourceMapGenerator = new sourceMap.SourceMapGenerator({ file:"outputFilenameTODO.css", sourceRoot:"http://blah.com/TODO" });
        this._rootNode.genCSS(env, this);

        //TODO write this to sourceMapFilename
        console.warn(this._sourceMapGenerator.toJSON());

        return this._css.join('');
    };

})(require('./tree'));