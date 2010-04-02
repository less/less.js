//
// Select all links with the 'rel' attribute set to "less"
//
var sheets = document.querySelectorAll("link[rel=less]");

for (var i = 0; i < sheets.length; i++) {
    (function (sheet) { // Because the functions here are async, we need to create a closure
        xhr(sheet.href, function (data) {
            new(less.Parser)({ optimization: 3 }).parse(data, function (e, root) {
                var css = document.createElement('style'), styles;
                css.type = 'text/css';
                css.media = 'screen';
                css.title = sheet.title || sheet.href.match(/\/([-\w]+)\.[a-z]+$/i)[1];
                styles = root.toCSS();

                if (css.styleSheet) {
                    css.styleSheet.cssText = styles;
                } else {
                    css.appendChild(document.createTextNode(styles));
                }
                document.getElementsByTagName('head')[0].appendChild(css);
            });
        });
    })(sheets[i]);
}

function xhr(url, callback, errback) {
    var xhr = new(XMLHttpRequest);
    var headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/*'
    };

    xhr.open('get', url, true);
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) { return }

        if (this.status >= 200 && this.status < 300) {
            callback(this.responseText); 
        } else if (typeof(errback) === 'function') {
            errback(this.responseText);
        }
    };
    xhr.send();
}
