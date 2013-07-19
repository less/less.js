(function (tree) {
    var sourceMap = require("source-map");

    tree.sourceMapOutput = function (options) {
        this._css = [];
        this._rootNode = options.rootNode;
        this._writeSourceMap = options.writeSourceMap;
        this._contentsMap = options.contentsMap;
        this._sourceMapFilename = options.sourceMapFilename;

        this._lineNumber = 0;
        this._column = 0;
    };

    tree.sourceMapOutput.prototype.add = function(chunk, fileInfo, index) {

        if (!chunk) {
            //TODO what is calling this with undefined?
            return;
        }

        var lines,
            columns;

        if (fileInfo) {
            var inputSource = this._contentsMap[fileInfo.filename].substring(0, index);
            lines = inputSource.split("\n");
            columns = lines[lines.length-1];
            this._sourceMapGenerator.addMapping({ generated: { line: this._lineNumber + 1, column: this._column}, original: { line: lines.length, column: columns.length}, source: fileInfo.filename});
        }
        lines = chunk.split("\n");
        columns = lines[lines.length-1];

        this._lineNumber += lines.length - 1;
        this._column += columns.length - 1;

        this._css.push(chunk);
    };

    tree.sourceMapOutput.prototype.toCSS = function(env) {
        this._sourceMapGenerator = new sourceMap.SourceMapGenerator({ file:"outputFilenameTODO.css", sourceRoot:"http://blah.com/TODO" });

        //TODO option to include source in sourcemaps?
        if (this._outputSourceFiles) {
            for(var filename in this._contentsMap) {
                this._sourceMapGenerator.setSourceContent(filename, this._contentsMap[filename]);
            }
        }

        this._rootNode.genCSS(env, this);

        this._writeSourceMap(JSON.stringify(this._sourceMapGenerator.toJSON()));

        if (this._sourceMapFilename) {
            this._css.push("/*# sourceMappingURL=" + this._sourceMapFilename + " */");
        }

        return this._css.join('');
    };

})(require('./tree'));