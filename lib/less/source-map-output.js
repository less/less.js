module.exports = function (environment) {

    /**
     * @param source The code
     * @param ignoredCharsCount Number of characters at the start of the file to ignore.
     * @constructor
     */
    var FileInfo = function (source, ignoredCharsCount) {
        this.ignoredCharsCount = ignoredCharsCount;
        this.source = source.slice(ignoredCharsCount);
        this.sourceLines = this.source.split('\n');
    };

    /** Translate absolute source offset to line/column offset. */
    FileInfo.prototype.getLocation = function (index) {
        index = Math.max(0, index - this.ignoredCharsCount);
        var line = 0;
        for (; line < this.sourceLines.length && index >= this.sourceLines[line].length + 1; line++) {
            index -= this.sourceLines[line].length + 1; // +1 for the '\n' character
        }
        return {line: line + 1, column: index};
    };

    var SourceMapOutput = function (options) {
        this._css = [];
        this._rootNode = options.rootNode;

        this._contentsInfoMap = {};
        for (var key in options.contentsMap) {
            if (options.contentsMap.hasOwnProperty(key)) {
                this._contentsInfoMap[key] = new FileInfo(
                    options.contentsMap[key], options.contentsIgnoredCharsMap[key] || 0);
            }
        }

        if (options.sourceMapFilename) {
            this._sourceMapFilename = options.sourceMapFilename.replace(/\\/g, '/');
        }
        this._outputFilename = options.outputFilename;
        this.sourceMapURL = options.sourceMapURL;
        if (options.sourceMapBasepath) {
            this._sourceMapBasepath = options.sourceMapBasepath.replace(/\\/g, '/');
        }
        if (options.sourceMapRootpath) {
            this._sourceMapRootpath = options.sourceMapRootpath.replace(/\\/g, '/');
            if (this._sourceMapRootpath.charAt(this._sourceMapRootpath.length - 1) !== '/') {
                this._sourceMapRootpath += '/';
            }
        } else {
            this._sourceMapRootpath = "";
        }
        this._outputSourceFiles = options.outputSourceFiles;
        this._sourceMapGeneratorConstructor = environment.getSourceMapGenerator();

        this._lineNumber = 0;
        this._column = 0;
    };

    SourceMapOutput.prototype.normalizeFilename = function(filename) {
        filename = filename.replace(/\\/g, '/');

        if (this._sourceMapBasepath && filename.indexOf(this._sourceMapBasepath) === 0) {
            filename = filename.substring(this._sourceMapBasepath.length);
            if (filename.charAt(0) === '\\' || filename.charAt(0) === '/') {
                filename = filename.substring(1);
            }
        }
        return (this._sourceMapRootpath || "") + filename;
    };

    SourceMapOutput.prototype.add = function(chunk, fileInfo, index, mapLines) {

        //ignore adding empty strings
        if (!chunk) {
            return;
        }

        var lines,
            columns,
            i;

        lines = chunk.split("\n");
        columns = lines[lines.length - 1];

        if (fileInfo) {
            var location = this._contentsInfoMap[fileInfo.filename].getLocation(index);
            if (!mapLines) {
                this._sourceMapGenerator.addMapping({ generated: { line: this._lineNumber + 1, column: this._column},
                    original: location,
                    source: this.normalizeFilename(fileInfo.filename)});
            } else {
                for (i = 0; i < lines.length; i++) {
                    this._sourceMapGenerator.addMapping({ generated: { line: this._lineNumber + i + 1, column: i === 0 ? this._column : 0},
                        original: { line: location.line + i, column: i === 0 ? location.column : 0},
                        source: this.normalizeFilename(fileInfo.filename)});
                }
            }
        }

        if (lines.length === 1) {
            this._column += columns.length;
        } else {
            this._lineNumber += lines.length - 1;
            this._column = columns.length;
        }

        this._css.push(chunk);
    };

    SourceMapOutput.prototype.isEmpty = function() {
        return this._css.length === 0;
    };

    SourceMapOutput.prototype.toCSS = function(context) {
        this._sourceMapGenerator = new this._sourceMapGeneratorConstructor({ file: this._outputFilename, sourceRoot: null });

        if (this._outputSourceFiles) {
            for (var filename in this._contentsMap) {
                if (this._contentsInfoMap.hasOwnProperty(filename)) {
                    var source = this._contentsInfoMap[filename].source;
                    this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), source);
                }
            }
        }

        this._rootNode.genCSS(context, this);

        if (this._css.length > 0) {
            var sourceMapURL,
                sourceMapContent = JSON.stringify(this._sourceMapGenerator.toJSON());

            if (this.sourceMapURL) {
                sourceMapURL = this.sourceMapURL;
            } else if (this._sourceMapFilename) {
                sourceMapURL = this._sourceMapFilename;
            }
            this.sourceMapURL = sourceMapURL;

            this.sourceMap = sourceMapContent;
        }

        return this._css.join('');
    };

    return SourceMapOutput;
};
