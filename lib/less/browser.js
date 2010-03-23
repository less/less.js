//
// Select all links with the 'rel' attribute set to "less"
//
var sheets = document.querySelectorAll("link[rel=less]");

for (var i = 0; i < sheets.length; i++) {
    xhr(sheets[i].href, function (data) {
        new(less.Parser)({ optimizations: 3 }).parse(data, function (e, root) {
            document.styleSheets[0].insertRule(root.toCSS());
        });
    });
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
