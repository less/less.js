//
// browser.js - client-side engine
//
/*global window, document, location */

var logLevel = {
    debug: 3,
    info: 2,
    errors: 1,
    none: 0
};

var less;

function log(str, level) {
    if (typeof(console) !== 'undefined' && less.logLevel >= level) {
        console.log('less: ' + str);
    }
}

/*
  TODO - options is now hidden - we should expose it on the less object, but not have it "as" the less object
         alternately even have it on environment
         e.g. less.environment.options.fileAsync = true;
         is it weird you do
         less = { fileAsync: true }
         then access as less.environment.options.fileAsync ?
 */

var isFileProtocol = /^(file|chrome(-extension)?|resource|qrc|app):/.test(location.protocol),
    options = window.less,
    environment = require("./environment.js")(options, isFileProtocol, log, logLevel);

window.less = less = require('../less/index.js')(environment);

less.env = options.env || (location.hostname == '127.0.0.1' ||
                        location.hostname == '0.0.0.0'   ||
                        location.hostname == 'localhost' ||
                        (location.port &&
                          location.port.length > 0)      ||
                        isFileProtocol                   ? 'development'
                                                         : 'production');

// The amount of logging in the javascript console.
// 3 - Debug, information and errors
// 2 - Information and errors
// 1 - Errors
// 0 - None
// Defaults to 2
less.logLevel = typeof(options.logLevel) != 'undefined' ? options.logLevel : (less.env === 'development' ?  logLevel.debug : logLevel.errors);

// Load styles asynchronously (default: false)
//
// This is set to `false` by default, so that the body
// doesn't start loading before the stylesheets are parsed.
// Setting this to `true` can result in flickering.
//
options.async = options.async || false;
options.fileAsync = options.fileAsync || false;

// Interval between watch polls
less.poll = less.poll || (isFileProtocol ? 1000 : 1500);

//Setup user functions
if (options.functions) {
    less.functions.functionRegistry.addMultiple(options.functions);
}

var dumpLineNumbers = /!dumpLineNumbers:(comments|mediaquery|all)/.exec(location.hash);
if (dumpLineNumbers) {
    less.dumpLineNumbers = dumpLineNumbers[1];
}

var typePattern = /^text\/(x-)?less$/;
var cache = null;

function extractId(href) {
    return href.replace(/^[a-z-]+:\/+?[^\/]+/, '' )  // Remove protocol & domain
        .replace(/^\//,                 '' )  // Remove root /
        .replace(/\.[a-zA-Z]+$/,        '' )  // Remove simple extension
        .replace(/[^\.\w-]+/g,          '-')  // Replace illegal characters
        .replace(/\./g,                 ':'); // Replace dots with colons(for valid id)
}

function errorConsole(e, rootHref) {
    var template = '{line} {content}';
    var filename = e.filename || rootHref;
    var errors = [];
    var content = (e.type || "Syntax") + "Error: " + (e.message || 'There is an error in your .less file') +
        " in " + filename + " ";

    var errorline = function (e, i, classname) {
        if (e.extract[i] !== undefined) {
            errors.push(template.replace(/\{line\}/, (parseInt(e.line, 10) || 0) + (i - 1))
                .replace(/\{class\}/, classname)
                .replace(/\{content\}/, e.extract[i]));
        }
    };

    if (e.extract) {
        errorline(e, 0, '');
        errorline(e, 1, 'line');
        errorline(e, 2, '');
        content += 'on line ' + e.line + ', column ' + (e.column + 1) + ':\n' +
            errors.join('\n');
    } else if (e.stack) {
        content += e.stack;
    }
    log(content, logLevel.errors);
}

function createCSS(styles, sheet, lastModified) {
    // Strip the query-string
    var href = sheet.href || '';

    // If there is no title set, use the filename, minus the extension
    var id = 'less:' + (sheet.title || extractId(href));

    // If this has already been inserted into the DOM, we may need to replace it
    var oldCss = document.getElementById(id);
    var keepOldCss = false;

    // Create a new stylesheet node for insertion or (if necessary) replacement
    var css = document.createElement('style');
    css.setAttribute('type', 'text/css');
    if (sheet.media) {
        css.setAttribute('media', sheet.media);
    }
    css.id = id;

    if (!css.styleSheet) {
        css.appendChild(document.createTextNode(styles));

        // If new contents match contents of oldCss, don't replace oldCss
        keepOldCss = (oldCss !== null && oldCss.childNodes.length > 0 && css.childNodes.length > 0 &&
            oldCss.firstChild.nodeValue === css.firstChild.nodeValue);
    }

    var head = document.getElementsByTagName('head')[0];

    // If there is no oldCss, just append; otherwise, only append if we need
    // to replace oldCss with an updated stylesheet
    if (oldCss === null || keepOldCss === false) {
        var nextEl = sheet && sheet.nextSibling || null;
        if (nextEl) {
            nextEl.parentNode.insertBefore(css, nextEl);
        } else {
            head.appendChild(css);
        }
    }
    if (oldCss && keepOldCss === false) {
        oldCss.parentNode.removeChild(oldCss);
    }

    // For IE.
    // This needs to happen *after* the style element is added to the DOM, otherwise IE 7 and 8 may crash.
    // See http://social.msdn.microsoft.com/Forums/en-US/7e081b65-878a-4c22-8e68-c10d39c2ed32/internet-explorer-crashes-appending-style-element-to-head
    if (css.styleSheet) {
        try {
            css.styleSheet.cssText = styles;
        } catch (e) {
            throw new(Error)("Couldn't reassign styleSheet.cssText.");
        }
    }

    // Don't update the local store if the file wasn't modified
    if (lastModified && cache) {
        log('saving ' + href + ' to cache.', logLevel.info);
        try {
            cache.setItem(href, styles);
            cache.setItem(href + ':timestamp', lastModified);
        } catch(e) {
            //TODO - could do with adding more robust error handling
            log('failed to save', logLevel.errors);
        }
    }
}

function postProcessCSS(styles) {
    if (options.postProcessor && typeof options.postProcessor === 'function') {
        styles = options.postProcessor.call(styles, styles) || styles;
    }
    return styles;
}

function errorHTML(e, rootHref) {
    var id = 'less-error-message:' + extractId(rootHref || "");
    var template = '<li><label>{line}</label><pre class="{class}">{content}</pre></li>';
    var elem = document.createElement('div'), timer, content, errors = [];
    var filename = e.filename || rootHref;
    var filenameNoPath = filename.match(/([^\/]+(\?.*)?)$/)[1];

    elem.id        = id;
    elem.className = "less-error-message";

    content = '<h3>'  + (e.type || "Syntax") + "Error: " + (e.message || 'There is an error in your .less file') +
        '</h3>' + '<p>in <a href="' + filename   + '">' + filenameNoPath + "</a> ";

    var errorline = function (e, i, classname) {
        if (e.extract[i] !== undefined) {
            errors.push(template.replace(/\{line\}/, (parseInt(e.line, 10) || 0) + (i - 1))
                .replace(/\{class\}/, classname)
                .replace(/\{content\}/, e.extract[i]));
        }
    };

    if (e.extract) {
        errorline(e, 0, '');
        errorline(e, 1, 'line');
        errorline(e, 2, '');
        content += 'on line ' + e.line + ', column ' + (e.column + 1) + ':</p>' +
            '<ul>' + errors.join('') + '</ul>';
    } else if (e.stack) {
        content += '<br/>' + e.stack.split('\n').slice(1).join('<br/>');
    }
    elem.innerHTML = content;

    // CSS for error messages
    createCSS([
        '.less-error-message ul, .less-error-message li {',
        'list-style-type: none;',
        'margin-right: 15px;',
        'padding: 4px 0;',
        'margin: 0;',
        '}',
        '.less-error-message label {',
        'font-size: 12px;',
        'margin-right: 15px;',
        'padding: 4px 0;',
        'color: #cc7777;',
        '}',
        '.less-error-message pre {',
        'color: #dd6666;',
        'padding: 4px 0;',
        'margin: 0;',
        'display: inline-block;',
        '}',
        '.less-error-message pre.line {',
        'color: #ff0000;',
        '}',
        '.less-error-message h3 {',
        'font-size: 20px;',
        'font-weight: bold;',
        'padding: 15px 0 5px 0;',
        'margin: 0;',
        '}',
        '.less-error-message a {',
        'color: #10a',
        '}',
        '.less-error-message .error {',
        'color: red;',
        'font-weight: bold;',
        'padding-bottom: 2px;',
        'border-bottom: 1px dashed red;',
        '}'
    ].join('\n'), { title: 'error-message' });

    elem.style.cssText = [
        "font-family: Arial, sans-serif",
        "border: 1px solid #e00",
        "background-color: #eee",
        "border-radius: 5px",
        "-webkit-border-radius: 5px",
        "-moz-border-radius: 5px",
        "color: #e00",
        "padding: 15px",
        "margin-bottom: 15px"
    ].join(';');

    if (less.env == 'development') {
        timer = setInterval(function () {
            if (document.body) {
                if (document.getElementById(id)) {
                    document.body.replaceChild(elem, document.getElementById(id));
                } else {
                    document.body.insertBefore(elem, document.body.firstChild);
                }
                clearInterval(timer);
            }
        }, 10);
    }
}

function error(e, rootHref) {
    if (!options.errorReporting || options.errorReporting === "html") {
        errorHTML(e, rootHref);
    } else if (options.errorReporting === "console") {
        errorConsole(e, rootHref);
    } else if (typeof options.errorReporting === 'function') {
        options.errorReporting("add", e, rootHref);
    }
}

function removeErrorHTML(path) {
    var node = document.getElementById('less-error-message:' + extractId(path));
    if (node) {
        node.parentNode.removeChild(node);
    }
}

function removeErrorConsole(path) {
    //no action
}

function removeError(path) {
    if (!options.errorReporting || options.errorReporting === "html") {
        removeErrorHTML(path);
    } else if (options.errorReporting === "console") {
        removeErrorConsole(path);
    } else if (typeof options.errorReporting === 'function') {
        options.errorReporting("remove", path);
    }
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
                .then(bind(function(style, css) {
                    style.type = 'text/css';
                    if (style.styleSheet) {
                        style.styleSheet.cssText = css;
                    } else {
                        style.innerHTML = css;
                    }
                }, null, style),
                function(e) {
                    error(e, "inline");
                });
        }
    }
}

function loadStyleSheet(sheet, callback, reload, remaining, modifyVars) {

    var instanceOptions = clone(options);
    instanceOptions.mime = sheet.type;

    if (modifyVars) {
        instanceOptions.modifyVars = modifyVars;
    }
    if (modifyVars || options.globalVars) {
        instanceOptions.useFileCache = true;
    }

    less.environment.loadFile(instanceOptions, sheet.href, null, function loadInitialFileCallback(e, data, path, webInfo) {

        var newFileInfo = {
            currentDirectory: less.environment.getPath(instanceOptions, path),
            filename: path,
            rootFilename: path,
            relativeUrls: instanceOptions.relativeUrls};

        newFileInfo.entryPath = newFileInfo.currentDirectory;
        newFileInfo.rootpath = instanceOptions.rootpath || newFileInfo.currentDirectory;

        if (webInfo) {
            webInfo.remaining = remaining;

            var css       = cache && cache.getItem(path),
                timestamp = cache && cache.getItem(path + ':timestamp');

            if (!reload && timestamp && webInfo.lastModified &&
                (new(Date)(webInfo.lastModified).valueOf() ===
                    new(Date)(timestamp).valueOf())) {
                // Use local copy
                createCSS(css, sheet);
                webInfo.local = true;
                callback(null, null, data, sheet, webInfo, path);
                return;
            }
        }

        //TODO add tests around how this behaves when reloading
        removeError(path);

        if (data) {
            instanceOptions.currentFileInfo = newFileInfo;
            less.render(data, instanceOptions)
                .then(function(css) {
                    callback(null, css, data, sheet, webInfo, path);
                },
                function(e) {
                    callback(e, null, null, sheet);
                });
        } else {
            callback(e, null, null, sheet, webInfo, path);
        }
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
                loadStyleSheets(function (e, css, _, sheet, env) {
                    if (e) {
                        error(e, sheet.href);
                    } else if (css) {
                        css = postProcessCSS(css);
                        createCSS(css, sheet, env.lastModified);
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

if (less.env != 'development') {
    try {
        cache = (typeof(window.localStorage) === 'undefined') ? null : window.localStorage;
    } catch (_) {}
}

//
// Get all <link> tags with the 'rel' attribute set to "stylesheet/less"
//
var links = document.getElementsByTagName('link');

less.sheets = [];

for (var i = 0; i < links.length; i++) {
    if (links[i].rel === 'stylesheet/less' || (links[i].rel.match(/stylesheet/) &&
       (links[i].type.match(typePattern)))) {
        less.sheets.push(links[i]);
    }
}

//
// With this function, it's possible to alter variables and re-render
// CSS without reloading less-files
//
less.modifyVars = function(record) {
    less.refresh(false, record);
};

less.refresh = function (reload, modifyVars) {
    var startTime, endTime;
    startTime = endTime = new Date();

    loadStyleSheets(function (e, css, _, sheet, webInfo) {
        if (e) {
            return error(e, sheet.href);
        }
        if (webInfo.local) {
            log("loading " + sheet.href + " from cache.", logLevel.info);
        } else {
            log("rendered " + sheet.href + " successfully.", logLevel.debug);
            css = postProcessCSS(css);
            createCSS(css, sheet, webInfo.lastModified);
        }
        log("css for " + sheet.href + " generated in " + (new Date() - endTime) + 'ms', logLevel.info);
        if (webInfo.remaining === 0) {
            log("less has finished. css generated in " + (new Date() - startTime) + 'ms', logLevel.info);
        }
        endTime = new Date();
    }, reload, modifyVars);

    loadStyles(modifyVars);
};

less.refreshStyles = loadStyles;

less.refresh(less.env === 'development');
