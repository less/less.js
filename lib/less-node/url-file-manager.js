var isUrlRe = /^(?:https?:)?\/\//i,
    url = require('url'),
    phin,
    PromiseConstructor,
    AbstractFileManager = require('../less/environment/abstract-file-manager.js'),
    logger = require('../less/logger');

var UrlFileManager = function() {
};

UrlFileManager.prototype = new AbstractFileManager();

UrlFileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    return isUrlRe.test( filename ) || isUrlRe.test(currentDirectory);
};

UrlFileManager.prototype.loadFile = function(filename, currentDirectory, options, environment) {
    if (!PromiseConstructor) {
        PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;
    }
    return new PromiseConstructor(function(fulfill, reject) {
        if (phin === undefined) {
            try { phin = require('phin').unpromisified; }
            catch (e) { phin = null; }
        }
        if (!phin) {
            reject({ type: 'File', message: 'optional dependency \'phin\' required to import over http(s)\n' });
            return;
        }

        var urlStr = isUrlRe.test( filename ) ? filename : url.resolve(currentDirectory, filename),
            urlObj = url.parse(urlStr);

        if (!urlObj.protocol) {
            urlObj.protocol = 'http';
            urlStr = urlObj.format();
        }

        phin({url: urlStr}, function (error, res) {
            var body = res.body

            if (error) {
                reject({ type: 'File', message: 'resource \'' + urlStr + '\' gave this Error:\n  ' + error + '\n' });
                return;
            }
            if (res && res.statusCode === 404) {
                reject({ type: 'File', message: 'resource \'' + urlStr + '\' was not found\n' });
                return;
            }
            if (!body) {
                logger.warn('Warning: Empty body (HTTP ' + res.statusCode + ') returned by "' + urlStr + '"');
            }
            fulfill({ contents: body, filename: urlStr });
        });
    });
};

module.exports = UrlFileManager;
