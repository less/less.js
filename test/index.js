// Test if the environment is Java Nashorn/jjs
if (typeof Java !== 'undefined' && Java && typeof Java.type === 'function') {
    isNashornMode = true;

    // Initialize the require function
    if (typeof require === 'undefined') {
        // Probe for the libLessNashornPath and this directory
        // NOTE: If __DIR__ is specified that should be the only condition needed, just-in-case fallback to __FILE__
        if (typeof __DIR__ !== 'undefined' && java.nio.file.Files.isRegularFile(java.nio.file.Paths.get(__DIR__).resolve('../lib/less-nashorn/require.js')) === true) {
            libLessNashornPath = java.nio.file.Paths.get('').toAbsolutePath().relativize(java.nio.file.Paths.get(__DIR__).resolve('../lib/less-nashorn/.')).normalize();
        }
        else if (typeof __FILE__ !== 'undefined' && java.nio.file.Files.isRegularFile(java.nio.file.Paths.get(__FILE__).getParent().resolve('../lib/less-nashorn/require.js')) === true) {
            libLessNashornPath = java.nio.file.Paths.get('').toAbsolutePath().relativize(java.nio.file.Paths.get(__FILE__).getParent().resolve('../lib/less-nashorn/.').toAbsolutePath()).normalize();
        }
        else {
            throw new Error("Could not locate lib/less-nashorn/require.js, __DIR__ or __FILE__ should be defined");
        }
        var __rootDir = java.nio.file.Paths.get('').toAbsolutePath();
        var __dir = __rootDir.relativize(java.nio.file.Paths.get(libLessNashornPath).resolve('../../test').toAbsolutePath().normalize()).normalize();
        var __file = __dir.resolve('index.js');

        eval('//# sourceURL='+libLessNashornPath.resolve('require.js')+'\n' + new java.lang.String(java.nio.file.Files.readAllBytes(libLessNashornPath.resolve('require.js'))));
    }
}
else {
    isNashornMode = false;
}


if (isNashornMode) {
    // Global var's used in less-test.js
    global = this; // Used for testing global variable leaks
    logLevel = 'verbose';

    // Global node polyfill's
    require("process");
    require("console");
}
var lessTest = require("./less-test"),
    lessTester = lessTest(),
    path = require("path"),
    stylize = (isNashornMode ? require('../lib/less-nashorn/lessjjsc-helper'):require('../lib/less-node/lessc-helper')).stylize;

function getErrorPathReplacementFunction(dir) {
    return function(input, baseDir) {
        var modifiedInput = input.replace(/\{path\}/g, path.join(process.cwd(), baseDir, dir + "/"))
            .replace(/\{node\}/g, "")
            .replace(/\{\/node\}/g, "")
            .replace(/\{pathrel\}/g, path.join(baseDir, dir + "/"))
            .replace(/\{pathhref\}/g, "")
            .replace(/\{404status\}/g, "")
            .replace(/\r\n/g, '\n');
        if (isNashornMode) {
            modifiedInput = modifiedInput.replace(/Cannot read property '([^']*)' of /g, "Cannot read property '$1' from ");
        }
        return modifiedInput;
    };
}

console.log("\n" + stylize("Less", 'underline') + "\n");
lessTester.prepBomTest();
lessTester.runTestSet({strictMath: true, relativeUrls: true, silent: true});
lessTester.runTestSet({strictMath: true, strictUnits: true}, "errors/",
    lessTester.testErrors, null, getErrorPathReplacementFunction("errors"));
lessTester.runTestSet({strictMath: true, strictUnits: true, javascriptEnabled: false}, "no-js-errors/",
    lessTester.testErrors, null, getErrorPathReplacementFunction("no-js-errors"));
lessTester.runTestSet({strictMath: true, dumpLineNumbers: 'comments'}, "debug/", null,
    function(name) { return name + '-comments'; });
lessTester.runTestSet({strictMath: true, dumpLineNumbers: 'mediaquery'}, "debug/", null,
    function(name) { return name + '-mediaquery'; });
lessTester.runTestSet({strictMath: true, dumpLineNumbers: 'all'}, "debug/", null,
    function(name) { return name + '-all'; });
lessTester.runTestSet({strictMath: true, relativeUrls: false, rootpath: "folder (1)/"}, "static-urls/");
lessTester.runTestSet({strictMath: true, compress: true}, "compression/");
lessTester.runTestSet({strictMath: true, strictUnits: true}, "strict-units/");
lessTester.runTestSet({}, "legacy/");
lessTester.runTestSet({strictMath: true, strictUnits: true, sourceMap: true, globalVars: true }, "sourcemaps/",
    lessTester.testSourcemap, null, null,
    function(filename, type, baseFolder) {
        if (type === "vars") {
            return path.join(baseFolder, filename) + '.json';
        }
        return path.join('test/sourcemaps', filename) + '.json';
    });
lessTester.runTestSet({strictMath: true, strictUnits: true, sourceMap: {sourceMapFileInline: true}}, "sourcemaps-empty/", lessTester.testEmptySourcemap);
lessTester.runTestSet({globalVars: true, banner: "/**\n  * Test\n  */\n"}, "globalVars/",
    null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; });
lessTester.runTestSet({modifyVars: true}, "modifyVars/",
    null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; });
lessTester.runTestSet({urlArgs: '424242'}, "url-args/");
lessTester.runTestSet({paths: ['test/data/', 'test/less/import/']}, "include-path/");
lessTester.runTestSet({paths: 'test/data/'}, "include-path-string/");
lessTester.runTestSet({plugin: 'test/plugins/postprocess/'}, "postProcessorPlugin/");
lessTester.runTestSet({plugin: 'test/plugins/preprocess/'}, "preProcessorPlugin/");
lessTester.runTestSet({plugin: 'test/plugins/visitor/'}, "visitorPlugin/");
lessTester.runTestSet({plugin: 'test/plugins/filemanager/'}, "filemanagerPlugin/");
lessTester.runTestSet({}, "no-strict-math/");
lessTester.testSyncronous({syncImport: true}, "import");
lessTester.testSyncronous({syncImport: true}, "css");
lessTester.testNoOptions();
lessTester.finished();
