//
// Select all links with the 'rel' attribute set to "less"
//
var sheets = (document.querySelectorAll ? document.querySelectorAll
                                        : jQuery)('link[rel="stylesheet/less"]');

less.env = location.hostname == '127.0.0.1' ||
           location.hostname == '0.0.0.0'   ||
           location.hostname == 'localhost' ||
           location.protocol == 'file:'     ? 'development'
                                            : 'production';

for (var i = 0; i < sheets.length; i++) {
    (function (sheet) { // Because the functions here are async, we need to create a closure
        var css = localStorage && localStorage.getItem(sheet.href);
        var styles = css && JSON.parse(css);

        xhr(sheet.href, function (data, lastModified) {
            if (styles && (new(Date)(lastModified).valueOf() ===
                           new(Date)(styles.timestamp).valueOf())) {
                // Use local copy
                createCSS(styles.css, sheet);
                log("less: loading " + sheet.href + " from local storage.");
            } else {
                // Use remote copy (re-parse)
                new(less.Parser)({ optimization: 3 }).parse(data, function (e, root) {
                    if (e) { return error(e, sheet.href) }
                    createCSS(root.toCSS(), sheet, lastModified);
                    log("less: parsed " + sheet.href + " successfully.");
                });
            }
        });
    })(sheets[i]);
}

function createCSS(styles, sheet, lastModified) {
    var css = document.createElement('style');
    css.type = 'text/css';
    css.media = 'screen';
    css.title = 'lessheet';

    if (sheet) {
        css.title = sheet.title || sheet.href.match(/\/([-\w]+)\.[a-z]+$/i)[1];

        // Don't update the local store if the file wasn't modified
        if (lastModified && localStorage) {
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
    var xhr = new(XMLHttpRequest);

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
            if (this.readyState == 4) {
                if (this.status >= 200 && this.status < 300) {
                    callback(this.responseText,
                             this.getResponseHeader("Last-Modified"));
                } else if (typeof(errback) === 'function') {
                    errback(this.responseText);
                }
            }
        };
        xhr.send(null);
    }
}

function log(str) {
    if (less.env == 'development') { console.log(str) }
}

function error(e, href) {
    var template = ['<div>',
                        '<pre class="ctx"><span>[-1]</span>{0}</pre>',
                        '<pre><span>[0]</span>{current}</pre>',
                        '<pre class="ctx"><span>[1]</span>{2}</pre>',
                    '</div>'].join('\n');

    var elem = document.createElement('div'), timer;
    elem.id = "less-error-message";
    elem.innerHTML = '<h3>There is an error in your .less file</h3> '           +
                     '<p><a href="' + href   + '">' + href + "</a> "            +
                     'on line '     + e.line + ', column ' + e.column + ':</p>' +
                     template.replace(/\[(-?\d)\]/g, function (_, i) {
                         console.log(i)
                         return e.line + parseInt(i);
                     }).replace(/\{(\d)\}/g, function (_, i) {
                         return e.extract[parseInt(i)];
                     }).replace(/\{current\}/, e.extract[1].slice(0, e.column)  +
                                               '<span class="error">'           +
                                               e.extract[1].slice(e.column) +
                                               '</span>');

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
            'color: #ee7777;',
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
