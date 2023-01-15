export default {
    encodeBase64: function encodeBase64(str) {
        return Buffer.from(str).toString('base64');
    },
    mimeLookup: function (filename) {
        return require('mime').getType(filename);
    },
    charsetLookup: function (mime) {
        return (/^text\/|^application\/(javascript|json)/).test(mime) ? 'UTF-8' : undefined;
    },
    getSourceMapGenerator: function getSourceMapGenerator() {
        return require('source-map').SourceMapGenerator;
    }
};
