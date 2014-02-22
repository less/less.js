var path = require('path'),
    url = require('url'),
    request,
    fs = require('fs'),
    isUrlRe = /^(?:https?:)?\/\//i;

module.exports = {
    warn: function(env, msg) {
        console.warn(msg);
    },
    getPath: function (env, filename) {
        var j = filename.lastIndexOf('/');
        if (j < 0) {
            j = filename.lastIndexOf('\\');
        }
        if (j < 0) {
            return "";
        }
        return filename.slice(0, j + 1);
    },
    isPathAbsolute: function(env, filename) {
        return /^(?:[a-z-]+:|\/|\\)/.test(filename);
    },
    loadFile: function(env, filename, currentDirectory, callback) {
        var fullFilename,
            data, 
            isUrl = isUrlRe.test( filename );

        if (isUrl || isUrlRe.test(currentDirectory)) {
            if (request === undefined) {
                try { request = require('request'); }
                catch(e) { request = null; }
            }
            if (!request) {
                callback({ type: 'File', message: "optional dependency 'request' required to import over http(s)\n" });
                return;
            }

            var urlStr = isUrl ? filename : url.resolve(currentDirectory, filename);

            request.get({uri: urlStr, strictSSL: !env.insecure }, function (error, res, body) {
                if (res.statusCode === 404) {
                    callback({ type: 'File', message: "resource '" + urlStr + "' was not found\n" });
                    return;
                }
                if (!body) {
                    this.warn( env, 'Warning: Empty body (HTTP '+ res.statusCode + ') returned by "' + urlStr +'"');
                }
                if (error) {
                    callback({ type: 'File', message: "resource '" + urlStr + "' gave this Error:\n  "+ error +"\n" });
                }
                fullFilename = urlStr;
                callback(null, body, fullFilename);
            });
        } else {

            var paths = [currentDirectory].concat(env.paths);
            paths.push('.');

            if (env.syncImport) {
                for (var i = 0; i < paths.length; i++) {
                    try {
                        fullFilename = path.join(paths[i], filename);
                        fs.statSync(fullFilename);
                        break;
                    } catch (e) {
                        fullFilename = null;
                    }
                }

                if (!fullFilename) {
                    callback({ type: 'File', message: "'" + filename + "' wasn't found" });
                    return;
                }

                try {
                    data = fs.readFileSync(fullFilename, 'utf-8');
                    callback(null, data, fullFilename);
                } catch (e) {
                    callback(e);
                }
            } else {
                (function tryPathIndex(i) {
                    if (i < paths.length) {
                        fullFilename = path.join(paths[i], filename);
                        fs.stat(fullFilename, function (err) {
                            if (err) {
                                tryPathIndex(i + 1);
                            } else {
                                fs.readFile(fullFilename, 'utf-8', function(e, data) {
                                    if (e) { callback(e); }
                                    callback(null, data, fullFilename);
                                });
                            }
                        });
                    } else {
                        callback({ type: 'File', message: "'" + filename + "' wasn't found" });
                    }
                }(0));
            }
        }
    }
};