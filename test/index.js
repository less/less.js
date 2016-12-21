var lessTest = require("./less-test"),
    lessTester = lessTest(),
    path = require("path"),
    stylize = require('../lib/less-node/lessc-helper').stylize;

function getErrorPathReplacementFunction(dir) {
    return function(input, baseDir) {
        return input.replace(/\{path\}/g, path.join(process.cwd(), baseDir, dir + "/"))
            .replace(/\{node\}/g, "")
            .replace(/\{\/node\}/g, "")
            .replace(/\{pathrel\}/g, path.join(baseDir, dir + "/"))
            .replace(/\{pathhref\}/g, "")
            .replace(/\{404status\}/g, "")
            .replace(/\r\n/g, '\n');
    };
}

console.log("\n" + stylize("Less", 'underline') + "\n");

lessTester.prepBomTest();
var testMap = [
    [{strictMath: true, relativeUrls: true, silent: true, javascriptEnabled: true}],
    [{strictMath: true, strictUnits: true, javascriptEnabled: true}, "errors/",
        lessTester.testErrors, null, getErrorPathReplacementFunction("errors")],
    [{strictMath: true, strictUnits: true, javascriptEnabled: false}, "no-js-errors/",
        lessTester.testErrors, null, getErrorPathReplacementFunction("no-js-errors")],
    [{strictMath: true, dumpLineNumbers: 'comments'}, "debug/", null,
        function(name) { return name + '-comments'; }],
    [{strictMath: true, dumpLineNumbers: 'mediaquery'}, "debug/", null,
        function(name) { return name + '-mediaquery'; }],
    [{strictMath: true, dumpLineNumbers: 'all'}, "debug/", null,
        function(name) { return name + '-all'; }],
    [{strictMath: true, relativeUrls: false, rootpath: "folder (1)/"}, "static-urls/"],
    [{strictMath: true, compress: true}, "compression/"],
    [{strictMath: true, strictUnits: true}, "strict-units/"],
    [{}, "legacy/"],
    [{strictMath: true, strictUnits: true, sourceMap: true, globalVars: true }, "sourcemaps/",
        lessTester.testSourcemap, null, null,
        function(filename, type, baseFolder) {
            if (type === "vars") {
                return path.join(baseFolder, filename) + '.json';
            }
            return path.join('test/sourcemaps', filename) + '.json';
        }],
    [{strictMath: true, strictUnits: true, sourceMap: {sourceMapFileInline: true}},
        "sourcemaps-empty/", lessTester.testEmptySourcemap],
    [{globalVars: true, banner: "/**\n  * Test\n  */\n"}, "globalVars/",
        null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; }],
    [{modifyVars: true}, "modifyVars/",
        null, null, null, function(name, type, baseFolder) { return path.join(baseFolder, name) + '.json'; }],
    [{urlArgs: '424242'}, "url-args/"],
    [{paths: ['test/data/', 'test/less/import/']}, "include-path/"],
    [{paths: 'test/data/'}, "include-path-string/"],
    [{plugin: 'test/plugins/postprocess/'}, "postProcessorPlugin/"],
    [{plugin: 'test/plugins/preprocess/'}, "preProcessorPlugin/"],
    [{plugin: 'test/plugins/visitor/'}, "visitorPlugin/"],
    [{plugin: 'test/plugins/filemanager/'}, "filemanagerPlugin/"],
    [{}, "no-strict-math/"]
];

testMap.forEach(function(args) {
    lessTester.runTestSet.apply(lessTester, args)
});
lessTester.testSyncronous({syncImport: true}, "import");
lessTester.testSyncronous({syncImport: true}, "css");
lessTester.testNoOptions();
lessTester.finished();
