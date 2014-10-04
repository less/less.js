/*global window, XMLHttpRequest */

module.exports = function(options, isFileProtocol, log, logLevel) {

var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    AbstractFileManager = require("../less/environment/abstract-file-manager.js");

var fileCache = {};

//TODOS - move log somewhere. pathDiff and doing something similar in node. use pathDiff in the other browser file for the initial load
//        isFileProtocol is global

function getXMLHttpRequest() {
    if (window.XMLHttpRequest && (window.location.protocol !== "file:" || !("ActiveXObject" in window))) {
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

var BrowserImport = function() {
};

BrowserImport.prototype = new AbstractFileManager();

BrowserImport.prototype.alwaysMakePathsAbsolute = function alwaysMakePathsAbsolute() {
    return true;
};
BrowserImport.prototype.join = function (url, baseUrl) {
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
};
BrowserImport.prototype.doXHR = function doXHR(url, type, callback, errback) {

    var xhr = getXMLHttpRequest();
    var async = isFileProtocol ? options.fileAsync : options.async;

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

    if (isFileProtocol && !options.fileAsync) {
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
};
BrowserImport.prototype.supports = function(filename, currentDirectory, options, environment) {
    return true;
};

BrowserImport.prototype.loadFile = function loadFile(filename, currentDirectory, options, environment) {
    return new PromiseConstructor(function(fullfill, reject) {
        if (currentDirectory && !this.isPathAbsolute(filename)) {
            filename = currentDirectory + filename;
        }

        options = options || {};

        // sheet may be set to the stylesheet for the initial load or a collection of properties including
        // some env variables for imports
        var hrefParts = this.extractUrlParts(filename, window.location.href);
        var href      = hrefParts.url;

        if (options.useFileCache && fileCache[href]) {
            try {
                var lessText = fileCache[href];
                fullfill({ contents: lessText, filename: href, webInfo: { lastModified: new Date() }});
            } catch (e) {
                reject({filename: href, message: "Error loading file " + href + " error was " + e.message});
            }
            return;
        }

        this.doXHR(href, options.mime, function doXHRCallback(data, lastModified) {
            // per file cache
            fileCache[href] = data;

            // Use remote copy (re-parse)
            fullfill({ contents: data, filename: href, webInfo: { lastModified: lastModified }});
        }, function doXHRError(status, url) {
            reject({ type: 'File', message: "'" + url + "' wasn't found (" + status + ")", href: href });
        });
    }.bind(this));
};

return new BrowserImport();
};
