class SourceMapGeneratorFallback {
    addMapping(){}
    setSourceContent(){}
    toJSON(){
        return null;
    }
};

export default {
    encodeBase64: function encodeBase64(str) {
        // Avoid Buffer constructor on newer versions of Node.js.
        const buffer = (Buffer.from ? Buffer.from(str) : (new Buffer(str)));
        return buffer.toString('base64');
    },
    mimeLookup: function (filename) {
        const mimeModule = require('mime');
        return mimeModule ? mimeModule.lookup(filename) : "application/octet-stream";
    },
    charsetLookup: function (mime) {
        const mimeModule = require('mime');
        return mimeModule ? mimeModule.charsets.lookup(mime) : undefined;
    },
    getSourceMapGenerator: function getSourceMapGenerator() {
        const sourceMapModule = require('source-map');
        return sourceMapModule ? sourceMapModule.SourceMapGenerator : SourceMapGeneratorFallback;
    }
};
