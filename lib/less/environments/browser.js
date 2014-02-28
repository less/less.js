/*global window, XMLHttpRequest */

module.exports = function(less, isFileProtocol, log, logLevel) {

var fileCache = {};

//TODOS - move log somewhere. pathDiff and doing something similiar in node. use pathDiff in the other browser file for the initial load
//        isFileProtocol is global

function getXMLHttpRequest() {
    if (window.XMLHttpRequest && (window.location.protocol !== "file:" || !window.ActiveXObject)) {
        return new XMLHttpRequest();
    } else {
        try {
            /*global ActiveXObject */
            return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {
            log("browser doesn't support AJAX.", logLevel.errors);
            return null;
        }
    }
}

return {
    // make generic but overriddable
    warn: function warn(env, msg) {
        console.warn(msg);
    },
    // make generic but overriddable
    getPath: function getPath(env, filename) {
        var j = filename.lastIndexOf('/');
        if (j < 0) {
            j = filename.lastIndexOf('\\');
        }
        if (j < 0) {
            return "";
        }
        return filename.slice(0, j + 1);
    },
    // make generic but overriddable
    isPathAbsolute: function isPathAbsolute(env, filename) {
        return /^(?:[a-z-]+:|\/|\\)/.test(filename);
    },
    alwaysMakePathsAbsolute: function alwaysMakePathsAbsolute() {
        return true;
    },
    getCleanCSS: function () {
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
    join: function join(basePath, laterPath) {
        if (!basePath) {
            return laterPath;
        }
        return this.extractUrlParts(laterPath, basePath).path;
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
        if (!urlParts[1] || urlParts[2]) {
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
    doXHR: function doXHR(url, type, callback, errback) {

        var xhr = getXMLHttpRequest();
        var async = isFileProtocol ? less.fileAsync : less.async;

        if (typeof(xhr.overrideMimeType) === 'function') {
            xhr.overrideMimeType('text/css');
        }
        log("XHR: Getting '" + url + "'", logLevel.debug);
        xhr.open('GET', url, async);
        xhr.setRequestHeader('Accept', type || 'text/x-less, text/css; q=0.9, */*; q=0.5');
        xhr.send(null);

        function handleResponse(xhr, callback, errback) {
            if (xhr.status >= 200 && xhr.status < 300) {
                callback(xhr.responseText,
                    xhr.getResponseHeader("Last-Modified"));
            } else if (typeof(errback) === 'function') {
                errback(xhr.status, url);
            }
        }

        if (isFileProtocol && !less.fileAsync) {
            if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
                callback(xhr.responseText);
            } else {
                errback(xhr.status, url);
            }
        } else if (async) {
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    handleResponse(xhr, callback, errback);
                }
            };
        } else {
            handleResponse(xhr, callback, errback);
        }
    },
    loadFile: function loadFile(env, filename, currentDirectory, callback) {
        if (currentDirectory && !this.isPathAbsolute(env, filename)) {
            filename = currentDirectory + filename;
        }

        // sheet may be set to the stylesheet for the initial load or a collection of properties including
        // some env variables for imports
        var hrefParts = this.extractUrlParts(filename, window.location.href);
        var href      = hrefParts.url;

        if (env.useFileCache && fileCache[href]) {
            try {
                var lessText = fileCache[href];
                callback(null, lessText, href, { lastModified: new Date() });
            } catch (e) {
                callback(e, null, href);
            }
            return;
        }

        this.doXHR(href, env.mime, function doXHRCallback(data, lastModified) {
            // per file cache
            fileCache[href] = data;

            // Use remote copy (re-parse)
            callback(null, data, href, { lastModified: lastModified });
        }, function doXHRError(status, url) {
            callback({ type: 'File', message: "'" + url + "' wasn't found (" + status + ")" }, null, href);
        });

    }
};

};