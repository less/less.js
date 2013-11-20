var lessTest = require("./less-test"),
    lessTester = lessTest(),
    path = require("path"),
    stylize = require('../lib/less/lessc_helper').stylize;

function getErrorPathReplacementFunction(dir) {
    return function(input) {
        return input.replace(
                "{path}", path.join(process.cwd(), "/test/less/" + dir + "/"))
            .replace("{pathrel}", path.join("test", "less", dir + "/"))
            .replace("{pathhref}", "")
            .replace("{404status}", "")
            .replace(/\r\n/g, '\n');
    };
}

console.log("\n" + stylize("LESS", 'underline') + "\n");

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
lessTester.runTestSet({}, "legacy/");
lessTester.runTestSet({strictMath: true, strictUnits: true, sourceMap: true }, "sourcemaps/",
    lessTester.testSourcemap, null, null, function(filename) { return path.join('test/sourcemaps', filename) + '.json'; });

lessTester.testNoOptions();
