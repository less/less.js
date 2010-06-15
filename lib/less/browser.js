(function () {

less.env = location.hostname == '127.0.0.1' ||
           location.hostname == '0.0.0.0'   ||
           location.hostname == 'localhost' ||
           location.protocol == 'file:'     ||
           location.port.length > 0         ? 'development'
                                            : 'production';

// Load styles asynchronously (default: false)
//
// This is set to `false` by default, so that the body
// doesn't start loading before the stylesheets are parsed.
// Setting this to `true` can result in flickering.
//
less.async = false;

// Interval between watch polls
less.poll = location.protocol == 'file:' ? 1000 : 1500;

//
// Watch mode
//
less.watch   = function () { return this.watchMode = true };
less.unwatch = function () { return this.watchMode = false };

if (less.env === 'development') {
    less.optimization = 0;

    if (/!watch/.test(location.hash)) {
        less.watch();
    }
    less.watchTimer = setInterval(function () {
        if (less.watchMode) {
            loadStyleSheets(function (root, sheet, env) {
                if (root) {
                    createCSS(root.toCSS(), sheet, env.lastModified);
                }
            });
        }
    }, less.poll);
} else {
    less.optimization = 3;
}


//
// Select all links with the 'rel' attribute set to "less"
//
var sheets = select('link[rel="stylesheet/less"]');

loadStyleSheets(function (root, sheet, env) {
    if (env.local) {
        log("less: loading " + sheet.href + " from local storage.");
    } else {
        createCSS(root.toCSS(), sheet, env.lastModified);
        log("less: parsed " + sheet.href + " successfully.");
    }
});

function select(str) {
    if (!document.querySelectorAll && typeof(jQuery) === "undefined") {
        log("No selector method found");
    } else {
        return (document.querySelectorAll || jQuery).call(document, str);
    }
}

function loadStyleSheets(callback, async) {
    for (var i = 0; i < sheets.length; i++) {
        loadStyleSheet(sheets[i], callback, async);
    }
}

function loadStyleSheet(sheet, callback, async) {
    var css = typeof(localStorage) !== "undefined" && localStorage.getItem(sheet.href);
    var timestamp = typeof(localStorage) !== "undefined" && localStorage.getItem(sheet.href + ':timestamp');
    var styles = { css: css, timestamp: timestamp };

    xhr(sheet.href, async, function (data, lastModified) {
        if (styles && (new(Date)(lastModified).valueOf() ===
                       new(Date)(styles.timestamp).valueOf())) {
            // Use local copy
            createCSS(styles.css, sheet);
            callback(null, sheet, { local: true });
        } else {
            // Use remote copy (re-parse)
            new(less.Parser)({
                optimization: less.optimization
            }).parse(data, function (e, root) {
                if (e) { return error(e, sheet.href) }
                try {
                    callback(root, sheet, { local: false, lastModified: lastModified });
                    removeNode(document.getElementById('less-error-message'));
                } catch (e) {
                    error(e, sheet.href);
                }
            });
        }
    }, function (status) {
        throw new(Error)("Couldn't load " + sheet.href + " (" + status + ")");
    });
}

function createCSS(styles, sheet, lastModified) {
    var css, title, id;

    // If there is no title set, use the filename, minus the extension
    title = sheet.title || sheet.href.match(/(?:^|\/)([-\w]+)\.[a-z]+$/i)[1];
    id = 'less:' + title;

    // If the stylesheet doesn't exist, create a new node
    if ((css = document.getElementById(id)) === null) {
        css = document.createElement('style');
        css.type = 'text/css';
        css.media = 'screen';
        css.title = title;
        css.id = id;
        document.getElementsByTagName('head')[0].appendChild(css);
    }

    if (css.styleSheet) { // IE
        try {
            css.styleSheet.cssText = styles;
        } catch (e) {
            throw new(Error)("Couldn't reassign styleSheet.cssText.");
        }
    } else {
        (function (node) {
            if (css.childNodes.length > 0) {
                css.replaceChild(node, css.firstChild);
            } else {
                css.appendChild(node);
            }
        })(document.createTextNode(styles));
    }

    // Don't update the local store if the file wasn't modified
    if (lastModified && typeof(localStorage) !== "undefined") {
        localStorage.setItem(sheet.href, styles);
        localStorage.setItem(sheet.href + ':timestamp', lastModified);
    }
}

function xhr(url, async, callback, errback) {
    var xhr = getXMLHttpRequest();

    if (window.location.protocol === "file:") {
        xhr.open('GET', url, false);
        xhr.send(null);
        if (xhr.status === 0) {
            callback(xhr.responseText);
        } else {
            errback(xhr.status);
        }
    } else {
        xhr.open('GET', url, async || less.async);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    callback(xhr.responseText,
                             xhr.getResponseHeader("Last-Modified"));
                } else if (typeof(errback) === 'function') {
                    errback(xhr.status);
                }
            }
        };
        xhr.send(null);
    }
}

function getXMLHttpRequest() {
    if (window.XMLHttpRequest) {
        return new(XMLHttpRequest);
    } else {
        try {
            return new(ActiveXObject)("MSXML2.XMLHTTP.3.0");
        } catch (e) {
            log("less: browser doesn't support AJAX.");
            return null;
        }
    }
}

function removeNode(node) {
    return node && node.parentNode.removeChild(node);
}

function log(str) {
    if (less.env == 'development' && typeof(console) !== "undefined") { console.log(str) }
}

function error(e, href) {
    if (document.getElementById('less-error-message')) { return }

    var template = ['<div>',
                        '<pre class="ctx"><span>[-1]</span>{0}</pre>',
                        '<pre><span>[0]</span>{current}</pre>',
                        '<pre class="ctx"><span>[1]</span>{2}</pre>',
                    '</div>'].join('\n');

    var elem = document.createElement('div'), timer;
    elem.id = "less-error-message";
    elem.innerHTML = '<h3>' + (e.message || 'There is an error in your .less file') + '</h3>' +
                     '<p><a href="' + href   + '">' + href + "</a> "                +
                     'on line '     + e.line + ', column ' + (e.column + 1)         + ':</p>' +
                     template.replace(/\[(-?\d)\]/g, function (_, i) {
                         return e.line + parseInt(i);
                     }).replace(/\{(\d)\}/g, function (_, i) {
                         return e.extract[parseInt(i)];
                     }).replace(/\{current\}/, e.extract[1].slice(0, e.column)      +
                                               '<span class="error">'               +
                                               e.extract[1].slice(e.column)         +
                                               '</span>');
    // CSS for error messages
    createCSS([
        '#less-error-message span {',
            'margin-right: 15px;',
        '}',
        '#less-error-message pre {',
            'color: #ee4444;',
            'padding: 4px 0;',
            'margin: 0;',
        '}',
        '#less-error-message pre.ctx {',
            'color: #dd7777;',
        '}',
        '#less-error-message h3 {',
            'padding: 15px 0 5px 0;',
            'margin: 0;',
        '}',
        '#less-error-message a {',
            'color: #10a',
        '}',
        '#less-error-message .error {',
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
                document.body.insertBefore(elem, document.body.firstChild);
                clearInterval(timer);
            }
        }, 10);
    }
}

//
// Used by `@import` directives
//
less.Parser.importer = function (path, paths, callback) {
    loadStyleSheet({ href: path, title: path }, function (root) {
        callback(root);
    });
};

})();
