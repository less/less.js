var less = {
    logLevel: 4, 
    errorReporting: 'console', 
    javascriptEnabled: true,
    math: 'always'
};

// test inline less in style tags by grabbing an assortment of less files and doing `@import`s
var testFiles = ['charsets', 'colors', 'comments', 'css-3', 'strings', 'media', 'mixins'],
    testSheets = [];

// setup style tags with less and link tags pointing to expected css output

/**
 * @todo - generate the node_modules path for this file and in templates
 */
var lessFolder = '../../node_modules/@less/test-data/less'
var cssFolder = '../../node_modules/@less/test-data/css'

for (var i = 0; i < testFiles.length; i++) {
    var file = testFiles[i],
        lessPath  = lessFolder + '/_main/' + file + '.less',
        cssPath   = cssFolder + '/_main/' + file + '.css',
        lessStyle = document.createElement('style'),
        cssLink   = document.createElement('link'),
        lessText  = '@import "' + lessPath + '";';

    lessStyle.type = 'text/less';
    lessStyle.id = file;
    lessStyle.href = file;

    if (lessStyle.styleSheet === undefined) {
        lessStyle.appendChild(document.createTextNode(lessText));
    }

    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = cssPath;
    cssLink.id = 'expected-' + file;

    var head = document.getElementsByTagName('head')[0];

    head.appendChild(lessStyle);

    if (lessStyle.styleSheet) {
        lessStyle.styleSheet.cssText = lessText;
    }

    head.appendChild(cssLink);
    testSheets[i] = lessStyle;
}
