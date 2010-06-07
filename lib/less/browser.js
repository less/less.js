(function () {
//
// Select all links with the 'rel' attribute set to "less"
//
var sheets = [];

less.env = location.hostname == '127.0.0.1' ||
           location.hostname == '0.0.0.0'   ||
           location.hostname == 'localhost' ||
           location.protocol == 'file:'     ? 'development'
                                            : 'production';


// Load the stylesheets when the body is ready
var readyTimer = setInterval(function () {
    if (document.body) {
        if (!document.querySelectorAll && typeof(jQuery) === "undefined") {
            log("No selector method found");
        } else {
            sheets = (document.querySelectorAll || jQuery).call(document, 'link[rel="stylesheet/less"]');
        }
        clearInterval(readyTimer);
        loadStyleSheets(function (sheet, env) {
            if (env.local) {
                log("less: loading " + sheet.href + " from local storage.");
            } else {
                log("less: parsed " + sheet.href + " successfully.");
            }
        });
    }
}, 10);

//
// Auto-refresh
//
if (less.env === 'development') {
    refreshTimer = setInterval(function () {
        if (/!refresh/.test(location.hash)) {
            loadStyleSheets(function () {});
        }
    }, 1000);
}

function loadStyleSheets(callback) {
    for (var i = 0; i < sheets.length; i++) {
        loadStyleSheet(sheets[i], callback);
    }
}

function loadStyleSheet(sheet, callback) {
    var css = typeof(localStorage) !== "undefined" && localStorage.getItem(sheet.href);
    var styles = css && JSON.parse(css);

    xhr(sheet.href, function (data, lastModified) {
        if (styles && (new(Date)(lastModified).valueOf() ===
                       new(Date)(styles.timestamp).valueOf())) {
            // Use local copy
            createCSS(styles.css, sheet);
            callback(sheet, {local: true})
        } else {
            // Use remote copy (re-parse)
            new(less.Parser)({ optimization: 3 }).parse(data, function (e, root) {
                if (e) { return error(e, sheet.href) }
                try {
                    createCSS(root.toCSS(), sheet, lastModified);
                    callback(sheet, {local: false})
                } catch (e) {
                    error(e, sheet.href);
                }
            });
        }
    });
}

function createCSS(styles, sheet, lastModified) {
    var css = document.createElement('style');
    css.type = 'text/css';
    css.media = 'screen';
    css.title = 'less-sheet';

    if (sheet) {
        css.title = sheet.title || sheet.href.match(/(^|\/)([-\w]+)\.[a-z]+$/i)[1];

        // Don't update the local store if the file wasn't modified
        if (lastModified && typeof(localStorage) !== "undefined") {
            localStorage.setItem(sheet.href, JSON.stringify({ timestamp: lastModified, css: styles }));
        }
    }

    if (css.styleSheet) {
        css.styleSheet.cssText = styles;
    } else {
        css.appendChild(document.createTextNode(styles));
    }
    document.getElementsByTagName('head')[0].appendChild(css);
}

function xhr(url, callback, errback) {
    var xhr = getXMLHttpRequest();

    if (window.location.protocol === "file:") {
        xhr.open('GET', url, false);
        xhr.send(null);
        if (xhr.status === 0) {
            callback(xhr.responseText);
        } else {
            errback(xhr.responseText);
        }
    } else {
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    callback(xhr.responseText,
                             xhr.getResponseHeader("Last-Modified"));
                } else if (typeof(errback) === 'function') {
                    errback(xhr.responseText);
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

function log(str) {
    if (less.env == 'development' && typeof(console) !== "undefined") { console.log(str) }
}

function error(e, href) {
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

    elem.style.cssText = [
        "font-family: Arial, sans-serif",
        "border: 1px solid #e00",
        "background-color: #eee",
        "border-radius: 5px",
        "color: #e00",
        "padding: 15px",
        "margin-bottom: 15px"
    ].join(';');

    if (less.env == 'development') {
        timer = setInterval(function () {
            if (document.body) {
                document.body.insertBefore(elem, document.body.childNodes[0]);
                clearInterval(timer);
            }
        }, 10);
    }
}

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
].join(''));

})();
