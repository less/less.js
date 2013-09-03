describe("less.js browser behaviour", function() {
    testLessEqualsInDocument();

    it("has some log messages", function() {
        expect(logMessages.length).toBeGreaterThan(0);
    });

    // test inline less in style tags by grabbing an assortment of less files and doing `@import`s
    var testFiles = ['charsets', 'colors', 'comments', 'css-3', 'strings', 'media', 'mixins'],
        testSheets = [];

    // setup style tags with less and link tags pointing to expected css output
    for (var i = 0; i < testFiles.length; i++) {
        var file = testFiles[i],
            lessPath = '/less/' + file + '.less',
            cssPath = '/css/' + file + '.css',
            lessStyle = document.createElement('style'),
            cssLink = document.createElement('link'),
            lessText = '@import "' + lessPath + '";';
        lessStyle.type = 'text/less';
        lessStyle.id = file;
        if (lessStyle.styleSheet) {
            lessStyle.styleSheet.cssText = lessText;
        } else {
            lessStyle.innerHTML = lessText;
        }
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = cssPath;
        cssLink.id = 'expected-' + file;

        var head = document.getElementsByTagName('head')[0];
        head.appendChild(lessStyle);
        head.appendChild(cssLink);
        testSheets[i] = lessStyle;
    }

    for (var i = 0; i < testFiles.length; i++) {
        var sheet = testSheets[i];
        testSheet(sheet);
    }
});