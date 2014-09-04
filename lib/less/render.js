var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    contexts = require("./contexts.js"),
    getImportManager = require("./imports.js");

var render = function(Parser, environment) {
    var ParseTree = require("./parse-tree.js")(environment);
    return function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (callback) {
            render(input.options)
                .then(function(css) {
                    callback(null, css);
                },
                function(error) {
                    callback(error);
                });
        } else {
            var env = new contexts.parseEnv(options),
                imports = getImportManager(environment, env, Parser);

            var parser = new(Parser)(env, imports);

            return new PromiseConstructor(function (resolve, reject) {
                parser.parse(input, function (e, root) {
                    if (e) { return reject(e); }
                    try {
                        var parseTree = new ParseTree(root, imports);
                        resolve(parseTree.toCSS(options));
                    }
                    catch (err) { reject( err); }
                }, options);
            });
        }
    };
};
module.exports = render;
