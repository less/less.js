export default {
    encodeBase64(str) {
        return new Buffer(str).toString('base64');
    },
    mimeLookup(filename) {
        return require('mime').lookup(filename);
    },
    charsetLookup(mime) {
        return require('mime').charsets.lookup(mime);
    },
    getSourceMapGenerator: function getSourceMapGenerator() {
        return require("source-map").SourceMapGenerator;
    }
};
