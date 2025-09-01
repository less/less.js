var path = require('path'),
    lessTest = require('./less-test'),
    lessTester = lessTest(),
    stylize = require('../lib/less-node/lessc-helper').stylize,
    nock = require('nock');

console.log('\n' + stylize('Less', 'underline') + '\n');

// Glob patterns with exclusions
var globPatterns = [
    '../tests-config/*/*.less',
    '../tests-unit/*/*.less',
    '!../tests-config/sourcemaps/*',           // Exclude sourcemaps (need special handling)
    '!../tests-config/sourcemaps-empty/*',     // Exclude sourcemaps-empty (need special handling)
    '!../tests-config/sourcemaps-disable-annotation/*', // Exclude sourcemaps-disable-annotation (need special handling)
    '!../tests-config/sourcemaps-variable-selector/*',  // Exclude sourcemaps-variable-selector (need special handling)
    '!../tests-config/globalVars/*',           // Exclude globalVars (need JSON config handling)
    '!../tests-config/modifyVars/*',           // Exclude modifyVars (need JSON config handling)
    '!../tests-config/js-type-errors/*',       // Exclude js-type-errors (need special test function)
    '!../tests-config/no-js-errors/*',         // Exclude no-js-errors (need special test function)
];

var testMap = [
    // Run all tests using glob patterns (cosmiconfig will handle the configs)
    [{}, globPatterns],
    
    // Error tests still need specific configurations
    [{strictMath: true, strictUnits: true, javascriptEnabled: true}, '../tests-error/eval/',
        lessTester.testErrors, null],
    [{strictMath: true, strictUnits: true, javascriptEnabled: true}, '../tests-error/parse/',
        lessTester.testErrors, null],
    
    // Special test cases that need specific handling
    [{math: 'strict', strictUnits: true, javascriptEnabled: true}, '../tests-config/js-type-errors/',
        lessTester.testTypeErrors, null],
    [{math: 'strict', strictUnits: true, javascriptEnabled: false}, '../tests-config/no-js-errors/',
        lessTester.testErrors, null],
    
    // Sourcemap tests need special handling
    [{math: 'strict', strictUnits: true, sourceMap: true, globalVars: true }, '../tests-config/sourcemaps/',
        lessTester.testSourcemap, null, null,
        function(filename, type, baseFolder) {
            if (type === 'vars') {
                return path.join(baseFolder, filename) + '.json';
            }
            return path.join('test/sourcemaps', filename) + '.json';
        }],
    [{math: 'strict', strictUnits: true, sourceMap: {sourceMapFileInline: true}},
        '../tests-config/sourcemaps-empty/', lessTester.testEmptySourcemap],
    [{math: 'strict', strictUnits: true, sourceMap: {disableSourcemapAnnotation: true}},
        '../tests-config/sourcemaps-disable-annotation/', lessTester.testSourcemapWithoutUrlAnnotation],
    [{math: 'strict', strictUnits: true, sourceMap: true},
        '../tests-config/sourcemaps-variable-selector/', lessTester.testSourcemapWithVariableInSelector],
    
    // Import tests with JSON configs
    [{globalVars: true, banner: '/**\n  * Test\n  */\n'}, '../tests-config/globalVars/',
        null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; }],
    [{modifyVars: true}, '../tests-config/modifyVars/',
        null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; }]
];

testMap.forEach(function(args) {
    lessTester.runTestSet.apply(lessTester, args)
});

// Special synchronous tests
lessTester.testSyncronous({syncImport: true}, '../tests-unit/import/import');
lessTester.testSyncronous({syncImport: true}, '../tests-config/math-strict/css');

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
        '../tests-config/import-redirect/',
        lessTester.testImportRedirect(scope)
    );
    lessTester.finished();
})();
