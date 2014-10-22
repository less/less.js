//
// browser.js - client-side engine
//
/*global window, document, location */

var less;
var addDataAttr = require("./utils").addDataAttr;

/*
  TODO - options is now hidden - we should expose it on the less object, but not have it "as" the less object
         less = { fileAsync: true }
         then access as less.environment.options.fileAsync ?
 */

var isFileProtocol = /^(file|chrome(-extension)?|resource|qrc|app):/.test(window.location.protocol),
    options = window.less || {};

// use options from the current script tag data attribues
var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
})();
options = addDataAttr(options, script);

// shim Promise if required
require('promise/polyfill.js');

window.less = less = require('../less')();
var environment = less.environment,
    FileManager = require("./file-manager")(options, isFileProtocol, less.logger),
    fileManager = new FileManager();
environment.addFileManager(fileManager);
less.FileManager = FileManager;

require("./log-listener")(less, options);
var errors = require("./error-reporting")(window, less, options);
var browser = require("./browser");
var cache = less.cache = options.cache || require("./cache")(window, options, less.logger);

options.env = options.env || (window.location.hostname == '127.0.0.1' ||
                              window.location.hostname == '0.0.0.0'   ||
                              window.location.hostname == 'localhost' ||
                        (window.location.port &&
                         window.location.port.length > 0)      ||
                        isFileProtocol                   ? 'development'
                                                         : 'production');

// Load styles asynchronously (default: false)
//
// This is set to `false` by default, so that the body
// doesn't start loading before the stylesheets are parsed.
// Setting this to `true` can result in flickering.
//
options.async = options.async || false;
options.fileAsync = options.fileAsync || false;

// Interval between watch polls
options.poll = options.poll || (isFileProtocol ? 1000 : 1500);

//Setup user functions
if (options.functions) {
    less.functions.functionRegistry.addMultiple(options.functions);
}

var dumpLineNumbers = /!dumpLineNumbers:(comments|mediaquery|all)/.exec(location.hash);
if (dumpLineNumbers) {
    options.dumpLineNumbers = dumpLineNumbers[1];
}

var typePattern = /^text\/(x-)?less$/;

function postProcessCSS(styles) {
    if (options.postProcessor && typeof options.postProcessor === 'function') {
        styles = options.postProcessor.call(styles, styles) || styles;
    }
    return styles;
}

function clone(obj) {
    var cloned = {};
    for(var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            cloned[prop] = obj[prop];
        }
    }
    return cloned;
}

// only really needed for phantom
function bind(func, thisArg) {
    var curryArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
        var args = curryArgs.concat(Array.prototype.slice.call(arguments, 0));
        return func.apply(thisArg, args);
    };
}

function loadStyles(modifyVars) {
    var styles = document.getElementsByTagName('style'),
        style;

    for (var i = 0; i < styles.length; i++) {
        style = styles[i];
        if (style.type.match(typePattern)) {
            var instanceOptions = clone(options);
            instanceOptions.modifyVars = modifyVars;
            var lessText = style.innerHTML || '';
            instanceOptions.filename = document.location.href.replace(/#.*$/, '');

            if (modifyVars || instanceOptions.globalVars) {
                instanceOptions.useFileCache = true;
            }

            /*jshint loopfunc:true */
            // use closure to store current style
            less.render(lessText, instanceOptions)
                .then(bind(function(style, result) {
                    style.type = 'text/css';
                    if (style.styleSheet) {
                        style.styleSheet.cssText = result.css;
                    } else {
                        style.innerHTML = result.css;
                    }
                }, null, style),
                function(e) {
                    errors.add(e, "inline");
                });
        }
    }
}

function loadStyleSheet(sheet, callback, reload, remaining, modifyVars) {

    var instanceOptions = addDataAttr(clone(options), sheet);
    instanceOptions.mime = sheet.type;

    if (modifyVars) {
        instanceOptions.modifyVars = modifyVars;
    }
    if (modifyVars || options.globalVars) {
        instanceOptions.useFileCache = true;
    }

    fileManager.loadFile(sheet.href, null, instanceOptions, environment)
    .then(function loadInitialFileCallback(loadedFile) {

       var data = loadedFile.contents,
           path = loadedFile.filename,
           webInfo = loadedFile.webInfo;

        var newFileInfo = {
            currentDirectory: fileManager.getPath(path),
            filename: path,
            rootFilename: path,
            relativeUrls: instanceOptions.relativeUrls};

        newFileInfo.entryPath = newFileInfo.currentDirectory;
        newFileInfo.rootpath = instanceOptions.rootpath || newFileInfo.currentDirectory;

        if (webInfo) {
            webInfo.remaining = remaining;

            var css = cache.getCSS(path, webInfo);
            if (!reload && css) {
                browser.createCSS(window.document, css, sheet);
                webInfo.local = true;
                callback(null, null, data, sheet, webInfo, path);
                return;
            }
        }

        //TODO add tests around how this behaves when reloading
        errors.remove(path);

        instanceOptions.rootFileInfo = newFileInfo;
        less.render(data, instanceOptions)
            .then(function(result) {
                callback(null, result.css, data, sheet, webInfo, path);
            },
            function(e) {
                e.href = path;
                callback(e);
            });
    },
    function(e) {
        callback(e);
    });
}

function loadStyleSheets(callback, reload, modifyVars) {
    for (var i = 0; i < less.sheets.length; i++) {
        loadStyleSheet(less.sheets[i], callback, reload, less.sheets.length - (i + 1), modifyVars);
    }
}

function initRunningMode(){
    if (less.env === 'development') {
        less.watchTimer = setInterval(function () {
            if (less.watchMode) {
                loadStyleSheets(function (e, css, _, sheet, context) {
                    if (e) {
                        errors.add(e, e.href || sheet.href);
                    } else if (css) {
                        css = postProcessCSS(css);
                        browser.createCSS(window.document, css, sheet);
                        cache.setCSS(sheet.href, context.lastModified, css);
                    }
                });
            }
        }, options.poll);
    }
}

//
// Watch mode
//
less.watch   = function () {
    if (!less.watchMode ){
        less.env = 'development';
         initRunningMode();
    }
    this.watchMode = true;
    return true;
};

less.unwatch = function () {clearInterval(less.watchTimer); this.watchMode = false; return false; };

if (/!watch/.test(location.hash)) {
    less.watch();
}

//
// Get all <link> tags with the 'rel' attribute set to "stylesheet/less"
//
less.registerStylesheets = function() {
    return new Promise(function(resolve, reject) {
        var links = document.getElementsByTagName('link');
        less.sheets = [];

        for (var i = 0; i < links.length; i++) {
            if (links[i].rel === 'stylesheet/less' || (links[i].rel.match(/stylesheet/) &&
                (links[i].type.match(typePattern)))) {
                less.sheets.push(links[i]);
            }
        }

        resolve();
    });
};

//
// With this function, it's possible to alter variables and re-render
// CSS without reloading less-files
//
less.modifyVars = function(record) {
    return less.refresh(false, record);
};

less.refresh = function (reload, modifyVars) {
    return new Promise(function (resolve, reject) {
        var startTime, endTime, totalMilliseconds;
        startTime = endTime = new Date();

        loadStyleSheets(function (e, css, _, sheet, webInfo) {
            if (e) {
                errors.add(e, e.href || sheet.href);
                reject(e);
            }
            if (webInfo.local) {
                less.logger.info("loading " + sheet.href + " from cache.");
            } else {
                less.logger.info("rendered " + sheet.href + " successfully.");
                css = postProcessCSS(css);
                browser.createCSS(window.document, css, sheet);
                cache.setCSS(sheet.href, webInfo.lastModified, css);
            }
            less.logger.info("css for " + sheet.href + " generated in " + (new Date() - endTime) + 'ms');
            if (webInfo.remaining === 0) {
                totalMilliseconds = new Date() - startTime;
                less.logger.info("less has finished. css generated in " + totalMilliseconds + 'ms');
                resolve({
                    startTime: startTime,
                    endTime: endTime,
                    totalMilliseconds: totalMilliseconds,
                    sheets: less.sheets.length
                });
            }
            endTime = new Date();
        }, reload, modifyVars);

        loadStyles(modifyVars);
    });
};

less.refreshStyles = loadStyles;

less.pageLoadFinished = less.registerStylesheets().then(
    function () {
        return less.refresh(less.env === 'development');
    }
);
