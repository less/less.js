(function (tree) {
    var sourceMap = require("source-map");

    tree.sourceMapOutput = function (options) {
        this._css = [];
        this._rootNode = options.rootNode;
        this._writeSourceMap = options.writeSourceMap;
        this._contentsMap = options.contentsMap;
        this._sourceMapFilename = options.sourceMapFilename;
        this._outputFilename = options.outputFilename;
        this._sourceMapBasepath = options.sourceMapBasepath;
        this._sourceMapRootpath = options.sourceMapRootpath;
        this._outputSourceFiles = options.outputSourceFiles;

        if (this._sourceMapRootpath && this._sourceMapRootpath.charAt(this._sourceMapRootpath.length-1) !== '/') {
            this._sourceMapRootpath += '/';
        }

        this._lineNumber = 0;
        this._column = 0;
    };

    tree.sourceMapOutput.prototype.normalizeFilename = function(filename) {
        if (this._sourceMapBasepath && filename.indexOf(this._sourceMapBasepath) === 0) {
             filename = filename.substring(this._sourceMapBasepath.length);
             if (filename.charAt(0) === '\\' || filename.charAt(0) === '/') {
                filename = filename.substring(1);
             }
        }
        return this._sourceMapRootpath + filename.replace(/\\/g, '/');
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
            this._sourceMapGenerator.addMapping({ generated: { line: this._lineNumber + 1, column: this._column},
                original: { line: lines.length, column: columns.length},
                source: this.normalizeFilename(fileInfo.filename)});
        }
        lines = chunk.split("\n");
        columns = lines[lines.length-1];

        if (lines.length === 1) {
            this._column += columns.length;
        } else {
            this._lineNumber += lines.length - 1;
            this._column = columns.length;
        }

        this._css.push(chunk);
    };

    tree.sourceMapOutput.prototype.toCSS = function(env) {
        this._sourceMapGenerator = new sourceMap.SourceMapGenerator({ file: this._outputFilename, sourceRoot: null });

        if (this._outputSourceFiles) {
            for(var filename in this._contentsMap) {
                this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), this._contentsMap[filename]);
            }
        }

        this._rootNode.genCSS(env, this);

        this._writeSourceMap(JSON.stringify(this._sourceMapGenerator.toJSON()));

        if (this._sourceMapFilename) {
            this._css.push("/*# sourceMappingURL=" + this._sourceMapRootpath + this._sourceMapFilename + " */");
        }

        return this._css.join('');
    };

})(require('./tree'));