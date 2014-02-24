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
        return (/^(?:[a-z-]+:|\/|\\)/).test(filename);
    },
    alwaysMakePathsAbsolute: function alwaysMakePathsAbsolute() {
        return false;
    },
    join: function join(basePath, laterPath) {
        if (!basePath) {
            return laterPath;
        }
        return basePath + laterPath;
    },
    pathDiff: function pathDiff(url, baseUrl) {
        // diff between two paths to create a relative path

        var urlParts = this.extractUrlParts(url),
            baseUrlParts = this.extractUrlParts(baseUrl),
            i, max, urlDirectories, baseUrlDirectories, diff = "";
        if (urlParts.hostPart !== baseUrlParts.hostPart) {
            return "";
        }
        max = Math.max(baseUrlParts.directories.length, urlParts.directories.length);
        for(i = 0; i < max; i++) {
            if (baseUrlParts.directories[i] !== urlParts.directories[i]) { break; }
        }
        baseUrlDirectories = baseUrlParts.directories.slice(i);
        urlDirectories = urlParts.directories.slice(i);
        for(i = 0; i < baseUrlDirectories.length-1; i++) {
            diff += "../";
        }
        for(i = 0; i < urlDirectories.length-1; i++) {
            diff += urlDirectories[i] + "/";
        }
        return diff;
    },
    // helper function, not part of API
    extractUrlParts: function extractUrlParts(url, baseUrl) {
        // urlParts[1] = protocol&hostname || /
        // urlParts[2] = / if path relative to host base
        // urlParts[3] = directories
        // urlParts[4] = filename
        // urlParts[5] = parameters

        var urlPartsRegex = /^((?:[a-z-]+:)?\/+?(?:[^\/\?#]*\/)|([\/\\]))?((?:[^\/\\\?#]*[\/\\])*)([^\/\\\?#]*)([#\?].*)?$/i,
            urlParts = url.match(urlPartsRegex),
            returner = {}, directories = [], i, baseUrlParts;

        if (!urlParts) {
            throw new Error("Could not parse sheet href - '"+url+"'");
        }

        // Stylesheets in IE don't always return the full path
        if (baseUrl && (!urlParts[1] || urlParts[2])) {
            baseUrlParts = baseUrl.match(urlPartsRegex);
            if (!baseUrlParts) {
                throw new Error("Could not parse page url - '"+baseUrl+"'");
            }
            urlParts[1] = urlParts[1] || baseUrlParts[1] || "";
            if (!urlParts[2]) {
                urlParts[3] = baseUrlParts[3] + urlParts[3];
            }
        }

        if (urlParts[3]) {
            directories = urlParts[3].replace(/\\/g, "/").split("/");

            // extract out . before .. so .. doesn't absorb a non-directory
            for(i = 0; i < directories.length; i++) {
                if (directories[i] === ".") {
                    directories.splice(i, 1);
                    i -= 1;
                }
            }

            for(i = 0; i < directories.length; i++) {
                if (directories[i] === ".." && i > 0) {
                    directories.splice(i-1, 2);
                    i -= 2;
                }
            }
        }

        returner.hostPart = urlParts[1];
        returner.directories = directories;
        returner.path = urlParts[1] + directories.join("/");
        returner.fileUrl = returner.path + (urlParts[4] || "");
        returner.url = returner.fileUrl + (urlParts[5] || "");
        return returner;
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

                data = fs.readFileSync(fullFilename, 'utf-8');
                callback(null, data, fullFilename);
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