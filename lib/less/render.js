var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    contexts = require("./contexts"),
    Parser = require('./parser/parser'),
    PluginManager = require('./plugin-manager');

module.exports = function(environment, ParseTree, ImportManager) {
    var render = function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (callback) {
            render.call(this, input, options)
                .then(function(css) {
                    callback(null, css);
                },
                function(error) {
                    callback(error);
                });
        } else {
            var context,
                rootFileInfo,
                pluginManager = new PluginManager(this);

            pluginManager.addPlugins(options.plugins);
            options.pluginManager = pluginManager;

            context = new contexts.Parse(options);

            if (options.rootFileInfo) {
                rootFileInfo = options.rootFileInfo;
            } else {
                var filename = options.filename || "input";
                var entryPath = filename.replace(/[^\/\\]*$/, "");
                rootFileInfo = {
                    filename: filename,
                    relativeUrls: context.relativeUrls,
                    rootpath: context.rootpath || "",
                    currentDirectory: entryPath,
                    entryPath: entryPath,
                    rootFilename: filename
                };
            }

            var imports = new ImportManager(context, rootFileInfo);
            var parser = new Parser(context, imports, rootFileInfo);

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
