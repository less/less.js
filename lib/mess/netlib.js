var fs = require('fs'),
    http = require('http'),
    url = require('url');

/**
 * A library of net-interaction functions - this could be simplified
 */

module.exports = {
    /**
     * Download a file and return data
     *
     * @param {String} file_url the URI of the file.
     * @param {String} filename the filename on the system.
     * @param {String} encoding the encoding to use for the file.
     * @param {Function} callback to call after finishing the download and
     *   run with arguments [err, filename, data].
     */
    get: function(file_url, filename, encoding, callback) {
        var encoding = encoding || 'binary';
        var file_url = url.parse(file_url);
        var c = http.createClient(file_url.port || 80, file_url.hostname);
        var request = c.request('GET', file_url.pathname + '?' + file_url.query, {
            host: file_url.host,
            query: file_url.query
        });
        request.end();

        console.log('downloading: %s', file_url.hostname);
        var body = [];
        request.on('response', function(response) {
            response.setEncoding(encoding);
            response.on('data', function(chunk) {
                body.push(chunk);
            });
            response.on('end', function() {
                body = body.join("");
                callback(null, filename, body);
            });
            response.on('error', function(err) {
                console.log('error downloading file');
                callback(err, null);
            });
        });
    },

    /**
     * Download a file
     *
     * @param {String} file_url the URI of the file.
     * @param {String} filename the filename on the system.
     * @param {String} encoding the encoding to use for the file.
     * @param {Function} callback to call after finishing the download and
     *   run with arguments [err, filename, data].
     */
    download: function(file_url_raw, filename, encoding, callback) {
        var encoding = encoding || 'binary';
        var file_url = url.parse(file_url_raw);
        var c = http.createClient(file_url.port || 80, file_url.hostname);
        var request = c.request('GET', file_url.pathname + '?' + file_url.query, {
            host: file_url.hostname
        });
        request.end();

        console.log('downloading: %s', file_url.hostname);
        var body = [];
        request.on('response', function(response) {
            response.setEncoding(encoding);
            response.on('data', function(chunk) {
                body.push(chunk);
            });
            response.on('end', function() {
                body = body.join("");
                fs.writeFile(filename, body, encoding, function() {
                    console.log('download finished');
                    callback(null, file_url_raw, filename);
                });
            });
            response.on('error', function(err) {
                console.log('error downloading file');
                callback(err, null);
            });
        });
    },

    /**
     * Encode a string as base64
     *
     * TODO: actually make safe64 by chunking
     *
     * @param {String} s the string to be encoded.
     * @return {String} base64 encoded string.
     */
    safe64: function(s) {
        var b = new Buffer(s, 'utf-8');
        return b.toString('base64').replace('/', '_').replace('+', '-');
    }
};
