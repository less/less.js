var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    contexts = require("./contexts"),
    Parser = require('./parser/parser');

module.exports = function(environment, ParseTree, ImportManager) {
    var render = function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (callback) {
            render(input, options)
                .then(function(css) {
                    callback(null, css);
                },
                function(error) {
                    callback(error);
                });
        } else {
            var env = new contexts.parseEnv(options),
                rootFileInfo;

            if (options.rootFileInfo) {
                rootFileInfo = options.rootFileInfo;
            } else {
                var filename = options.filename || "input";
                var entryPath = filename.replace(/[^\/\\]*$/, "");
                rootFileInfo = {
                    filename: filename,
                    relativeUrls: env.relativeUrls,
                    rootpath: env.rootpath || "",
                    currentDirectory: entryPath,
                    entryPath: entryPath,
                    rootFilename: filename
                };
            }

            var imports = new ImportManager(env, rootFileInfo);
            var parser = new Parser(env, imports, rootFileInfo);

            return new PromiseConstructor(function (resolve, reject) {
                parser.parse(input, function (e, root) {
                    if (e) { return reject(e); }
                    try {
                        var parseTree = new ParseTree(root, imports);
                        var result = parseTree.toCSS(options);
                        resolve(result);
                    }
                    catch (err) { reject( err); }
                }, options);
            });
        }
    };
    return render;
};
