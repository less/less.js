var lessTest = require('./less-test'),
    lessTester = lessTest(),
    path = require('path'),
    stylize = require('../lib/less-node/lessc-helper').stylize,
    nock = require('nock');

console.log('\n' + stylize('Less', 'underline') + '\n');

var testMap = [
    [{
        // TODO: Change this to rewriteUrls: 'all' once the relativeUrls option is removed
        relativeUrls: true,
        silent: true,
        javascriptEnabled: true
    }, '_main/'],
    [{}, 'namespacing/'],
    [{
        math: 'parens'
    }, 'math/strict/'],
    [{
        math: 'parens-division'
    }, 'math/parens-division/'],
    [{
        math: 'always'
    }, 'math/always/'],
    // Use legacy strictMath: true here to demonstrate it still works
    [{strictMath: true, strictUnits: true, javascriptEnabled: true}, '../errors/eval/',
        lessTester.testErrors, null],
    [{strictMath: true, strictUnits: true, javascriptEnabled: true}, '../errors/parse/',
        lessTester.testErrors, null],
    [{math: 'strict', strictUnits: true, javascriptEnabled: true}, 'js-type-errors/',
        lessTester.testTypeErrors, null],
    [{math: 'strict', strictUnits: true, javascriptEnabled: false}, 'no-js-errors/',
        lessTester.testErrors, null],
    [{math: 'strict', dumpLineNumbers: 'comments'}, 'debug/', null,
        function(name) { return name + '-comments'; }],
    [{math: 'strict', dumpLineNumbers: 'mediaquery'}, 'debug/', null,
        function(name) { return name + '-mediaquery'; }],
    [{math: 'strict', dumpLineNumbers: 'all'}, 'debug/', null,
        function(name) { return name + '-all'; }],
    // TODO: Change this to rewriteUrls: false once the relativeUrls option is removed
    [{math: 'strict', relativeUrls: false, rootpath: 'folder (1)/'}, 'static-urls/'],
    [{math: 'strict', compress: true}, 'compression/'],

    [{math: 0, strictUnits: true}, 'units/strict/'],
    [{math: 0, strictUnits: false}, 'units/no-strict/'],

    [{math: 'strict', strictUnits: true, sourceMap: true, globalVars: true }, 'sourcemaps/',
        lessTester.testSourcemap, null, null,
        function(filename, type, baseFolder) {
            if (type === 'vars') {
                return path.join(baseFolder, filename) + '.json';
            }
            return path.join('test/sourcemaps', filename) + '.json';
        }],

    [{math: 'strict', strictUnits: true, globalVars: true }, '_main/import/json/',
        lessTester.testImports, null, true,
        function(filename, type, baseFolder) {
            return path.join(baseFolder, filename) + '.json';
        }],
    [{math: 'strict', strictUnits: true, sourceMap: {sourceMapFileInline: true}},
        'sourcemaps-empty/', lessTester.testEmptySourcemap],
    [{math: 'strict', strictUnits: true, sourceMap: {disableSourcemapAnnotation: true}},
        'sourcemaps-disable-annotation/', lessTester.testSourcemapWithoutUrlAnnotation],
    [{math: 'strict', strictUnits: true, sourceMap: true},
        'sourcemaps-variable-selector/', lessTester.testSourcemapWithVariableInSelector],
    [{globalVars: true, banner: '/**\n  * Test\n  */\n'}, 'globalVars/',
        null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; }],
    [{modifyVars: true}, 'modifyVars/',
        null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; }],
    [{urlArgs: '424242'}, 'url-args/'],
    [{rewriteUrls: 'all'}, 'rewrite-urls-all/'],
    [{rewriteUrls: 'local'}, 'rewrite-urls-local/'],
    [{rootpath: 'http://example.com/assets/css/', rewriteUrls: 'all'}, 'rootpath-rewrite-urls-all/'],
    [{rootpath: 'http://example.com/assets/css/', rewriteUrls: 'local'}, 'rootpath-rewrite-urls-local/'],
    [{paths: ['data/', '_main/import/']}, 'include-path/'],
    [{paths: 'data/'}, 'include-path-string/'],
    [{plugin: 'test/plugins/postprocess/'}, 'postProcessorPlugin/'],
    [{plugin: 'test/plugins/preprocess/'}, 'preProcessorPlugin/'],
    [{plugin: 'test/plugins/visitor/'}, 'visitorPlugin/'],
    [{plugin: 'test/plugins/filemanager/'}, 'filemanagerPlugin/'],
    [{math: 0}, '3rd-party/'],
    [{ processImports: false }, 'process-imports/']
];
testMap.forEach(function(args) {
    lessTester.runTestSet.apply(lessTester, args)
});
lessTester.testSyncronous({syncImport: true}, '_main/import');
lessTester.testSyncronous({syncImport: true}, '_main/plugin');
lessTester.testSyncronous({syncImport: true}, 'math/strict/css');
lessTester.testNoOptions();
lessTester.testDisablePluginRule();
lessTester.testJSImport();
lessTester.finished();

(() => {
    // Create new tester, since tests are not independent and tests
    // above modify tester in a way that breaks remote imports.
    lessTester = lessTest();
    var scope = nock('https://example.com')
        .get('/redirect.less').query(true)
        .reply(301, null, { location: '/target.less' })
        .get('/target.less').query(true)
        .reply(200);
    lessTester.runTestSet(
        {},
        'import-redirect/',
        lessTester.testImportRedirect(scope)
    );
    lessTester.finished();
})();
